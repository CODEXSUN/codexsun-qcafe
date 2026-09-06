import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { identityPermissionKeys, identityRoleKeys, type IdentityAccountUpsert } from "./types.js";
import type { IdentityService } from "./service.js";
import { clearBrowserSession, readRefreshCookie, setBrowserSession } from "./browser-session.js";

const loginSchema = z.object({ login: z.string().trim().email().max(254), password: z.string().min(1).max(1024) });
const refreshSchema = z.object({ refreshToken: z.string().min(1) });
const accountSchema = z.object({
  applicationIds: z.array(z.string().regex(/^app\.[a-z0-9-]+$/u)).max(50),
  login: z.string().trim().email().max(254),
  password: z.string().min(8).max(1024).optional(),
  permissions: z.array(z.enum(identityPermissionKeys)).max(identityPermissionKeys.length),
  responsibilities: z.array(z.string().trim().min(1).max(160)).max(20),
  role: z.enum(identityRoleKeys),
  scope: z.literal("single-client"),
  status: z.enum(["active", "suspended"]),
});

export function registerIdentityRoutes(app: FastifyInstance, service: IdentityService): void {
  app.get("/api/v1/identity/setup", async (_request, reply) => reply.header("Cache-Control", "no-store").send({ available: await service.firstLoginAvailable(), expiresAt: service.firstLoginExpiresAt() }));
  app.post("/api/v1/identity/setup", async (request, reply) => {
    const input = loginSchema.extend({ code: z.string().min(10).max(1024), password: z.string().min(8).max(1024) }).safeParse(request.body);
    if (!input.success) return reply.code(400).send({ error: "Enter your setup code and a password of at least 8 characters." });
    try { const result = await service.completeFirstLogin(input.data); setBrowserSession(reply, result); return reply.header("Cache-Control", "no-store").code(201).send(result); }
    catch { return reply.code(401).send({ error: "Setup is unavailable or the setup credentials are invalid." }); }
  });
  app.post("/api/v1/identity/login", async (request, reply) => {
    const input = loginSchema.safeParse(request.body);
    if (!input.success) return reply.code(400).send({ error: "Invalid login request." });
    try { const result = await service.login(input.data); setBrowserSession(reply, result); return reply.code(201).send(result); }
    catch { return reply.code(401).send({ error: "Invalid identity credentials." }); }
  });
  app.post("/api/v1/identity/refresh", async (request, reply) => {
    const input = refreshSchema.safeParse(request.body ?? { refreshToken: readRefreshCookie(request.headers.cookie) });
    if (!input.success) return reply.code(400).send({ error: "Invalid refresh request." });
    try { const result = await service.refresh(input.data.refreshToken); setBrowserSession(reply, result); return reply.send(result); }
    catch { return reply.code(401).send({ error: "Session is invalid or expired." }); }
  });
  app.get("/api/v1/identity/verify", async (request, reply) => guarded(reply, () => service.verifyAccessToken(bearer(request.headers.authorization)).then(claims => ({ claims })), 401, "Authentication is required."));
  app.get("/api/v1/identity/me", async (request, reply) => guarded(reply, () => service.profile(bearer(request.headers.authorization)).then(profile => ({ profile })), 401, "Authentication is required."));
  app.post("/api/v1/identity/logout", async (request, reply) => {
    try { await service.revoke((await service.verifyAccessToken(bearer(request.headers.authorization))).sid); }
    catch { const refreshToken = readRefreshCookie(request.headers.cookie); if (refreshToken) { try { await service.revokeRefreshToken(refreshToken); } catch {} } }
    clearBrowserSession(reply); return reply.code(204).send();
  });
  app.get("/api/v1/identity/directory", async (request, reply) => guarded(reply, () => service.directory(bearer(request.headers.authorization)).then(actors => ({ actors })), 403, "Directory access denied."));
  app.get("/api/v1/identity/installation", async (request, reply) => guarded(reply, async () => reply.header("X-OS-Login", await service.installationOperator(bearer(request.headers.authorization))).send({ authorized: true }), 401, "Operator access required."));
  app.get("/api/v1/identity/access-options", async (request, reply) => guarded(reply, () => service.accessOptions(bearer(request.headers.authorization)), 403, "Identity administration is required."));
  app.get("/api/v1/identity/accounts", async (request, reply) => guarded(reply, () => service.listManagedAccounts(bearer(request.headers.authorization)).then(accounts => ({ accounts })), 403, "Identity administration is required."));
  app.post("/api/v1/identity/accounts", async (request, reply) => {
    const input = accountSchema.safeParse(request.body);
    if (!input.success) return reply.code(400).send({ error: accountValidationMessage(input.error) });
    return guarded(reply, () => service.createManagedAccount(bearer(request.headers.authorization), input.data).then(account => reply.code(201).send({ account })), 403, "Identity administration is required.");
  });
  app.patch("/api/v1/identity/accounts/:accountId", async (request, reply) => {
    const input = accountSchema.safeParse(request.body);
    const params = z.object({ accountId: z.string().uuid() }).safeParse(request.params);
    if (!input.success || !params.success) return reply.code(400).send({ error: input.success ? "Enter a valid user identifier." : accountValidationMessage(input.error) });
    return guarded(reply, () => service.updateManagedAccount(bearer(request.headers.authorization), params.data.accountId, input.data).then(account => ({ account })), 403, "Identity administration is required.");
  });
  app.post("/api/v1/identity/sessions/:sessionId/revoke", async (request, reply) => {
    try {
      const claims = await service.verifyAccessToken(bearer(request.headers.authorization));
      const input = z.object({ sessionId: z.string().uuid() }).safeParse(request.params);
      if (!input.success) return reply.code(400).send({ error: "Invalid session identifier." });
      if (claims.sid !== input.data.sessionId && !claims.permissions.includes("identity.admin")) return reply.code(403).send({ error: "Permission is denied." });
      await service.revoke(input.data.sessionId); return reply.code(204).send();
    } catch { return reply.code(401).send({ error: "Authentication is required." }); }
  });
}

async function guarded(reply: { code(status: number): { send(value: unknown): unknown } }, operation: () => Promise<unknown>, status: number, message: string) { try { return await operation(); } catch (cause) { return reply.code(status).send({ error: cause instanceof Error && cause.message === "User not found." ? cause.message : message }); } }
function bearer(value: string | undefined): string { if (!value?.startsWith("Bearer ")) throw new Error("Missing token"); return value.slice(7); }

function accountValidationMessage(error: z.ZodError): string {
  return error.issues.some(issue => issue.path[0] === "login")
    ? "Enter a complete email address, for example arunesh@example.com."
    : "Enter a valid role, permissions, and application access.";
}

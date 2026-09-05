import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { IdentityService } from "./service.js";
import { clearBrowserSession, readRefreshCookie, setBrowserSession } from "./browser-session.js";

const loginSchema = z.object({ login: z.string().trim().min(1).max(254), password: z.string().min(1).max(1024) });
const refreshSchema = z.object({ refreshToken: z.string().min(1) });

export function registerIdentityRoutes(app: FastifyInstance, service: IdentityService): void {
  app.get("/api/v1/identity/setup", async (_request, reply) => {
    const available = await service.firstLoginAvailable();
    return reply.header("Cache-Control", "no-store").send({ available, expiresAt: available ? service.firstLoginExpiresAt() : undefined });
  });
  app.post("/api/v1/identity/setup", async (request, reply) => {
    const input = loginSchema.extend({ code: z.string().min(10).max(1024), password: z.string().min(8).max(1024) }).safeParse(request.body);
    if (!input.success) return reply.code(400).send({ error: "Enter your setup code and a password of at least 8 characters." });
    try {
      const result = await service.completeFirstLogin(input.data);
      setBrowserSession(reply, result);
      return reply.header("Cache-Control", "no-store").code(201).send(result);
    } catch { return reply.code(401).send({ error: "Setup is unavailable or the setup credentials are invalid." }); }
  });
  app.post("/api/v1/identity/login", async (request, reply) => {
    const input = loginSchema.safeParse(request.body);
    if (!input.success) return reply.code(400).send({ error: "Invalid login request." });
    try {
      const result = await service.login(input.data);
      setBrowserSession(reply, result);
      return reply.code(201).send(result);
    } catch {
      return reply.code(401).send({ error: "Invalid identity credentials." });
    }
  });
  app.post("/api/v1/identity/refresh", async (request, reply) => {
    const input = refreshSchema.safeParse(request.body ?? { refreshToken: readRefreshCookie(request.headers.cookie) });
    if (!input.success) return reply.code(400).send({ error: "Invalid refresh request." });
    try { const result = await service.refresh(input.data.refreshToken); setBrowserSession(reply, result); return reply.send(result); }
    catch { return reply.code(401).send({ error: "Session is invalid or expired." }); }
  });
  app.get("/api/v1/identity/verify", async (request, reply) => {
    try {
      return { claims: await service.verifyAccessToken(bearer(request.headers.authorization)) };
    } catch { return reply.code(401).send({ error: "Authentication is required." }); }
  });
  app.get("/api/v1/identity/me", async (request, reply) => {
    try { return { profile: await service.profile(bearer(request.headers.authorization)) }; }
    catch { return reply.code(401).send({ error: "Authentication is required." }); }
  });
  app.post("/api/v1/identity/logout", async (request, reply) => {
    try {
      const claims = await service.verifyAccessToken(bearer(request.headers.authorization));
      await service.revoke(claims.sid);
    } catch {
      const refreshToken = readRefreshCookie(request.headers.cookie);
      if (refreshToken) {
        try { await service.revokeRefreshToken(refreshToken); }
        catch { /* Clearing a stale browser session must remain idempotent. */ }
      }
    }
    clearBrowserSession(reply);
    return reply.code(204).send();
  });
  app.get("/api/v1/identity/directory", async (request, reply) => {
    try { return { actors: await service.directory(bearer(request.headers.authorization)) }; }
    catch { return reply.code(403).send({ error: "Directory access denied." }); }
  });
  app.get("/api/v1/identity/installation", async (request, reply) => {
    try { return reply.header("X-OS-Login", await service.installationOperator(bearer(request.headers.authorization))).send({ authorized: true }); }
    catch { return reply.code(401).send({ error: "Operator access required." }); }
  });
  app.post("/api/v1/identity/sessions/:sessionId/revoke", async (request, reply) => {
    let claims;
    try { claims = await service.verifyAccessToken(bearer(request.headers.authorization)); }
    catch { return reply.code(401).send({ error: "Authentication is required." }); }
    const input = z.object({ sessionId: z.string().uuid() }).safeParse(request.params);
    if (!input.success) return reply.code(400).send({ error: "Invalid session identifier." });
    if (claims.sid !== input.data.sessionId && !claims.permissions.includes("identity.admin")) {
      return reply.code(403).send({ error: "Permission is denied." });
    }
    await service.revoke(input.data.sessionId);
    return reply.code(204).send();
  });
}

function bearer(value: string | undefined): string {
  if (!value?.startsWith("Bearer ")) throw new Error("Missing token");
  return value.slice(7);
}

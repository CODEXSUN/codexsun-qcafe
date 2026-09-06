import { RemoteIdentityVerifier } from "@codexsun/platform-host-contracts";
import type { FastifyInstance } from "fastify";

export function registerIdentityAccess(app: FastifyInstance, environment = process.env): void {
  const url = environment.OS_IDENTITY_URL;
  if (!url) {
    if (environment.NODE_ENV === "production") throw new Error("OS_IDENTITY_URL is required in production.");
    return;
  }
  const identity = new RemoteIdentityVerifier(url);
  app.addHook("onRequest", async (request, reply) => {
    if (request.url === "/health" || request.method === "OPTIONS") return;
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith("Bearer ")) return reply.code(401).send({ error: "Sign in to CODEXSUN OS." });
    try {
      const claims = await identity.verifyAccessToken(authorization.slice(7));
      // Workspace storage remains installation-scoped until a tenant adapter is enabled.
      if (claims.scope !== "single-client" || !claims.permissions.includes("zetro.access") || !claims.appIds.includes("app.zetro")) {
        return reply.code(403).send({ error: "Zetro access is required." });
      }
      const permission = requiredPermission(request.method, request.url);
      if (permission && !claims.permissions.includes(permission)) return reply.code(403).send({ error: `${permission} is required.` });
    } catch { return reply.code(401).send({ error: "Session is invalid or expired." }); }
  });
}

export function requiredPermission(method: string, url: string): "installation.manage" | "tasks.manage" | undefined {
  const path = url.split("?", 1)[0] ?? url;
  if (method === "POST" && path === "/api/v1/zetro/knowledge/index") return "installation.manage";
  if (method === "PUT" && /^\/api\/v1\/zetro\/knowledge\/proposals\/[^/]+\/review$/u.test(path)) return "tasks.manage";
  if (method === "POST" && (/^\/api\/v1\/ai-tasks(?:\/[^/]+\/(?:start|approve|release))?$/u.test(path) || path === "/api/v1/zetro/runs" || /^\/api\/v1\/zetro\/runs\/[^/]+\/(?:approval|resume|cancel)$/u.test(path))) return "tasks.manage";
  return undefined;
}

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
      // Workspace storage is installation-scoped until a separate multi-user adapter is enabled.
      if (claims.scope !== "single-client" || !claims.permissions.includes("installation.manage") || !claims.appIds.includes("app.zetro")) {
        return reply.code(403).send({ error: "Installation access is required." });
      }
    } catch { return reply.code(401).send({ error: "Session is invalid or expired." }); }
  });
}

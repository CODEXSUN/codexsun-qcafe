import type { FastifyReply, FastifyRequest } from "fastify";
import type { IdentityClaims } from "@codexsun/identity-contracts";
import type { IdentityTokenVerifier, PlatformHostAdapter, PlatformHostContext } from "@codexsun/platform-host-contracts";

export class IdentityHostAdapter implements PlatformHostAdapter {
  constructor(private readonly verifier: IdentityTokenVerifier) {}

  async authenticate(bearerToken: string): Promise<PlatformHostContext> {
    const claims = await this.verifier.verifyAccessToken(bearerToken);
    return toHostContext(claims);
  }

  authorize(context: PlatformHostContext, permission: string, applicationId?: string): boolean {
    return context.actor.permissions.includes(permission)
      && (!applicationId || context.actor.applicationIds.includes(applicationId));
  }
}

export function extractBearerToken(value: string | undefined): string | undefined {
  if (!value?.startsWith("Bearer ")) return undefined;
  const token = value.slice("Bearer ".length).trim();
  return token || undefined;
}

export function requireAuthorization(adapter: PlatformHostAdapter, permission: string, applicationId?: string) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<PlatformHostContext | undefined> => {
    const token = extractBearerToken(request.headers.authorization);
    if (!token) return reply.code(401).send({ error: "Authentication is required." });
    try {
      const context = await adapter.authenticate(token);
      if (!adapter.authorize(context, permission, applicationId)) return reply.code(403).send({ error: "Permission is denied." });
      return context;
    } catch {
      return reply.code(401).send({ error: "Platform session is invalid or expired." });
    }
  };
}

function toHostContext(claims: IdentityClaims): PlatformHostContext {
  return {
    actor: { applicationIds: claims.appIds, id: claims.sub, permissions: claims.permissions, sessionId: claims.sid },
    scope: claims.scope,
    tenantId: claims.tenantId,
  };
}

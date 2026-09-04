import { z } from "zod";

export const identityScopeSchema = z.enum(["single-client", "tenant"]);
export const identityTokenTypeSchema = z.enum(["access", "refresh"]);
export const identityClaimsSchema = z.object({
  appIds: z.array(z.string().min(1)).default([]),
  aud: z.literal("codexsun-platform"),
  iat: z.number().int(),
  iss: z.literal("codexsun-identity"),
  jti: z.string().uuid(),
  permissions: z.array(z.string().min(1)).default([]),
  scope: identityScopeSchema,
  sid: z.string().uuid(),
  sub: z.string().uuid(),
  tenantId: z.string().uuid().optional(),
  type: identityTokenTypeSchema,
});

export type IdentityClaims = z.infer<typeof identityClaimsSchema>;
export type IdentityScope = z.infer<typeof identityScopeSchema>;
export type IdentityTokenType = z.infer<typeof identityTokenTypeSchema>;

export type IssuedIdentityTokens = { accessToken: string; refreshToken: string };
export type IdentityAuditEvent = { actorId: string; occurredAt: string; sessionId: string; type: "identity.login" | "identity.logout" | "identity.refresh" | "identity.revoked" };

import type { IdentityClaims } from "@codexsun/identity-contracts";

export type PlatformActor = {
  applicationIds: readonly string[];
  id: string;
  permissions: readonly string[];
  sessionId: string;
};

export type PlatformHostContext = {
  actor: PlatformActor;
  scope: IdentityClaims["scope"];
  tenantId?: string;
};

export interface IdentityTokenVerifier {
  verifyAccessToken(token: string): Promise<IdentityClaims>;
}

export interface PlatformHostAdapter {
  authenticate(bearerToken: string): Promise<PlatformHostContext>;
  authorize(context: PlatformHostContext, permission: string, applicationId?: string): boolean;
}

export type TenantResolutionInput = { actor: PlatformActor; applicationId: string; hostname: string };
export type ResolvedTenantContext = { databaseId: string; tenantId: string };

/** Tenant add-ons resolve trusted host metadata, never a caller-selected tenant. */
export interface TenantContextResolver {
  resolve(input: TenantResolutionInput): Promise<ResolvedTenantContext | undefined>;
}

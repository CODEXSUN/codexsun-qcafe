import type { IdentityClaims, IdentityScope, IssuedIdentityTokens } from "@codexsun/identity-contracts";

export type IdentityAccount = {
  applicationIds: string[];
  id: string;
  login: string;
  passwordHash: string;
  permissions: string[];
  scope: IdentityScope;
  tenantId?: string;
};

export type IdentitySession = { accountId: string; id: string; refreshTokenId: string; revokedAt?: string };
export type IdentityLoginInput = { login: string; password: string };
export type IdentityTokenKeyResolver = { keyId: string; resolve(keyId: string): Promise<Uint8Array | undefined> };
export type IdentityLoginResult = IssuedIdentityTokens & { claims: IdentityClaims };

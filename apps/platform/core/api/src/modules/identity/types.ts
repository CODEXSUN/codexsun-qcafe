import type { IdentityClaims, IdentityScope, IssuedIdentityTokens } from "@codexsun/identity-contracts";

export const identityRoleKeys = ["administrator", "manager", "member", "viewer"] as const;
export type IdentityRoleKey = (typeof identityRoleKeys)[number];
export const identityPermissionKeys = ["app.access", "identity.admin", "installation.manage", "devices.manage", "chat.access", "tasks.manage", "zetro.access"] as const;
export type IdentityPermissionKey = (typeof identityPermissionKeys)[number];

export const identityRolePermissions: Record<IdentityRoleKey, readonly IdentityPermissionKey[]> = {
  administrator: identityPermissionKeys,
  manager: ["app.access", "devices.manage", "chat.access", "tasks.manage", "zetro.access"],
  member: ["app.access", "chat.access", "tasks.manage", "zetro.access"],
  viewer: ["app.access", "chat.access", "zetro.access"],
};

export type IdentityAccount = {
  applicationIds: string[];
  id: string;
  login: string;
  passwordHash: string;
  permissions: string[];
  responsibilities?: string[];
  role?: IdentityRoleKey;
  scope: IdentityScope;
  status?: "active" | "suspended";
  tenantId?: string;
};

export type ManagedIdentityAccount = Omit<IdentityAccount, "passwordHash"> & { responsibilities: string[]; role: IdentityRoleKey; status: "active" | "suspended" };
export type IdentityAccountUpsert = { applicationIds: string[]; login: string; password?: string; permissions: string[]; responsibilities: string[]; role: IdentityRoleKey; scope: IdentityScope; status: "active" | "suspended" };
export type IdentitySession = { accountId: string; id: string; refreshTokenId: string; revokedAt?: string };
export type IdentityLoginInput = { login: string; password: string };
export type IdentityTokenKeyResolver = { keyId: string; resolve(keyId: string): Promise<Uint8Array | undefined> };
export type IdentityLoginResult = IssuedIdentityTokens & { claims: IdentityClaims };

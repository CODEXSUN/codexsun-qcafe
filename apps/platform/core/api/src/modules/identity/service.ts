import { randomBytes, randomUUID, scrypt as nodeScrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { SignJWT, jwtVerify } from "jose";
import { identityClaimsSchema, type IdentityClaims } from "@codexsun/identity-contracts";
import type { IdentityTokenVerifier } from "@codexsun/platform-host-contracts";
import type { IdentityEventPublisher } from "./events.js";
import type { IdentityRepository } from "./repository.js";
import { identityPermissionKeys, identityRoleKeys, identityRolePermissions, type IdentityAccount, type IdentityAccountUpsert, type IdentityLoginInput, type IdentityLoginResult, type IdentityRoleKey, type IdentitySession, type IdentityTokenKeyResolver, type ManagedIdentityAccount } from "./types.js";

const scrypt = promisify(nodeScrypt);
const encoder = new TextEncoder();
const minimumPasswordLength = 8;
const minimumSetupCodeLength = 10;

export type FirstLoginSetup = {
  bootstrapPassword: string;
  code: string;
  enabled: boolean;
  expiresAt: string;
  login: string;
};

export type PasswordResetSetup = {
  code: string;
  enabled: boolean;
  expiresAt: string;
};

export class IdentityService implements IdentityTokenVerifier {
  constructor(
    private readonly repository: IdentityRepository,
    private readonly keys: IdentityTokenKeyResolver,
    private readonly events: IdentityEventPublisher,
    private readonly setup: FirstLoginSetup = { bootstrapPassword: "", code: "", enabled: false, expiresAt: "", login: "" },
    private readonly passwordReset: PasswordResetSetup = { code: "", enabled: false, expiresAt: "" },
  ) {}

  async firstLoginAvailable(): Promise<boolean> {
    if (!this.isSetupActive()) return false;
    const account = await this.repository.findAccountByLogin(this.setup.login);
    return !!account && account.permissions.includes("identity.admin") && await verifyPassword(this.setup.bootstrapPassword, account.passwordHash);
  }

  firstLoginExpiresAt(): string | undefined { return this.isSetupActive() ? this.setup.expiresAt : undefined; }

  async completeFirstLogin(input: { login: string; code: string; password: string }): Promise<IdentityLoginResult> {
    if (!this.isSetupActive() || input.login.toLowerCase() !== this.setup.login.toLowerCase()) throw new Error("Setup unavailable.");
    const supplied = Buffer.from(input.code);
    const expected = Buffer.from(this.setup.code);
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) throw new Error("Invalid setup code.");
    if (input.password.length < minimumPasswordLength || input.password.length > 1024 || input.password === this.setup.code) throw new Error("Choose a new password with at least 8 characters.");
    const account = await this.repository.findAccountByLogin(this.setup.login);
    if (!account || !account.permissions.includes("identity.admin") || !await verifyPassword(this.setup.bootstrapPassword, account.passwordHash)) throw new Error("Setup unavailable.");
    const changed = await this.repository.replacePassword(account.id, account.passwordHash, await hashPassword(input.password));
    if (!changed) throw new Error("Setup already completed.");
    return this.login({ login: input.login, password: input.password });
  }

  passwordResetAvailable(): boolean { return this.isPasswordResetActive(); }

  passwordResetExpiresAt(): string | undefined { return this.isPasswordResetActive() ? this.passwordReset.expiresAt : undefined; }

  async resetPassword(input: { code: string; login: string; password: string }): Promise<IdentityLoginResult> {
    if (!this.isPasswordResetActive() || input.password.length < minimumPasswordLength || input.password.length > 1024 || !matchesSecret(input.code, this.passwordReset.code)) throw new Error("Password reset is unavailable.");
    const account = await this.repository.findAccountByLogin(input.login);
    if (!account || account.status === "suspended") throw new Error("Password reset is unavailable.");
    const changed = await this.repository.replacePassword(account.id, account.passwordHash, await hashPassword(input.password));
    if (!changed) throw new Error("Password reset is unavailable.");
    return this.login({ login: input.login, password: input.password });
  }

  async login(input: IdentityLoginInput): Promise<IdentityLoginResult> {
    const account = await this.repository.findAccountByLogin(input.login);
    if (!account || account.status === "suspended" || !await verifyPassword(input.password, account.passwordHash)) throw new Error("Invalid identity credentials.");
    const session = { accountId: account.id, id: randomUUID(), refreshTokenId: randomUUID() };
    await this.repository.saveSession(session);
    const result = await this.issue(account, session);
    await this.publish("identity.login", account.id, session.id);
    return result;
  }

  async refresh(refreshToken: string): Promise<IdentityLoginResult> {
    const claims = await this.verify(refreshToken, "refresh");
    const session = await this.repository.findSession(claims.sid);
    if (!session || session.revokedAt || session.refreshTokenId !== claims.jti) throw new Error("Identity session is revoked or expired.");
    const account = await this.repository.findAccountById(claims.sub);
    if (!account || account.status === "suspended") throw new Error("Identity account is unavailable.");
    const rotated = { ...session, refreshTokenId: randomUUID() };
    await this.repository.saveSession(rotated);
    const result = await this.issue(account, rotated);
    await this.publish("identity.refresh", account.id, session.id);
    return result;
  }

  async revoke(sessionId: string): Promise<void> {
    const session = await this.repository.findSession(sessionId);
    if (!session || session.revokedAt) return;
    await this.repository.saveSession({ ...session, revokedAt: new Date().toISOString() });
    await this.publish("identity.revoked", session.accountId, session.id);
  }

  async revokeRefreshToken(refreshToken: string): Promise<void> {
    const claims = await this.verify(refreshToken, "refresh");
    const session = await this.repository.findSession(claims.sid);
    if (!session || session.revokedAt || session.accountId !== claims.sub || session.refreshTokenId !== claims.jti) throw new Error("Identity session is revoked or expired.");
    await this.revoke(claims.sid);
  }

  async profile(token: string): Promise<{ id: string; login: string; permissions: string[]; scope: IdentityClaims["scope"] }> {
    const claims = await this.verifyAccessToken(token);
    const account = await this.repository.findAccountById(claims.sub);
    if (!account) throw new Error("Identity account is unavailable.");
    return { id: account.id, login: account.login, permissions: [...account.permissions], scope: account.scope };
  }

  async verifyAccessToken(token: string): Promise<IdentityClaims> {
    const claims = await this.verify(token, "access");
    const session = await this.repository.findSession(claims.sid);
    if (!session || session.revokedAt || session.accountId !== claims.sub) throw new Error("Identity session is revoked or expired.");
    return claims;
  }

  async listManagedAccounts(token: string): Promise<ManagedIdentityAccount[]> {
    await this.requireIdentityAdmin(token);
    return (await this.repository.listAccounts()).map(toManagedAccount);
  }

  async accessOptions(token: string) {
    await this.requireIdentityAdmin(token);
    return {
      permissions: identityPermissionKeys,
      roles: identityRoleKeys.map(key => ({ key, permissions: identityRolePermissions[key] })),
    };
  }

  async createManagedAccount(token: string, input: IdentityAccountUpsert): Promise<ManagedIdentityAccount> {
    await this.requireIdentityAdmin(token);
    if (!input.password || input.password.length < minimumPasswordLength) throw new Error("A new user password must contain at least 8 characters.");
    const account = this.toManagedAccount({ ...input, id: randomUUID(), passwordHash: await hashPassword(input.password) });
    if (await this.repository.findAccountByLogin(account.login)) throw new Error("A user with this email already exists.");
    await this.repository.createAccount(account);
    return toManagedAccount(account);
  }

  async updateManagedAccount(token: string, id: string, input: IdentityAccountUpsert): Promise<ManagedIdentityAccount> {
    const claims = await this.requireIdentityAdmin(token);
    const current = await this.repository.findAccountById(id);
    if (!current) throw new Error("User not found.");
    const next = this.toManagedAccount({ ...input, id, passwordHash: input.password ? await hashPassword(input.password) : current.passwordHash, tenantId: current.tenantId });
    if (current.login !== next.login && await this.repository.findAccountByLogin(next.login)) throw new Error("A user with this email already exists.");
    if (current.id === claims.sub && next.status === "suspended") throw new Error("You cannot suspend your current administrator account.");
    if (current.permissions.includes("identity.admin") && !next.permissions.includes("identity.admin") && !(await this.hasAnotherAdministrator(current.id))) throw new Error("At least one active administrator is required.");
    await this.repository.updateAccount(next);
    await this.repository.revokeAccountSessions(id);
    return toManagedAccount(next);
  }
  async directory(token: string) {
    const claims = await this.verifyAccessToken(token);
    if (claims.scope !== "single-client" || !claims.permissions.includes("chat.access")) throw new Error("Permission denied.");
    return (await this.repository.listAccounts()).filter(account => account.scope === "single-client" && account.permissions.includes("chat.access"))
      .map(account => ({ uuid: account.id, name: account.login, email: account.login }));
  }

  async installationOperator(token: string): Promise<string> {
    const claims = await this.verifyAccessToken(token);
    if (claims.scope !== "single-client" || !claims.permissions.includes("installation.manage")) throw new Error("Permission denied.");
    const account = await this.repository.findAccountById(claims.sub);
    if (!account) throw new Error("Account unavailable.");
    return account.login;
  }

  private async requireIdentityAdmin(token: string) {
    const claims = await this.verifyAccessToken(token);
    if (claims.scope !== "single-client" || !claims.permissions.includes("identity.admin")) throw new Error("Permission denied.");
    return claims;
  }

  private async hasAnotherAdministrator(excludingId: string) {
    return (await this.repository.listAccounts()).some(account => account.id !== excludingId && account.status !== "suspended" && account.permissions.includes("identity.admin"));
  }

  private toManagedAccount(input: IdentityAccountUpsert & { id: string; passwordHash: string; tenantId?: string }): IdentityAccount {
    if (!identityRoleKeys.includes(input.role as IdentityRoleKey)) throw new Error("Invalid role.");
    if (!input.applicationIds.every(appId => /^app\.[a-z0-9-]+$/u.test(appId))) throw new Error("Invalid application access.");
    if (!input.permissions.every(permission => identityPermissionKeys.includes(permission as typeof identityPermissionKeys[number]))) throw new Error("Invalid permission.");
    if (!input.responsibilities.every(item => item.trim().length > 0 && item.length <= 160)) throw new Error("Invalid responsibility.");
    const rolePermissions = identityRolePermissions[input.role];
    const permissions = [...new Set([...rolePermissions, ...input.permissions])];
    return { applicationIds: [...new Set(input.applicationIds)], id: input.id, login: input.login.trim().toLowerCase(), passwordHash: input.passwordHash, permissions, responsibilities: [...new Set(input.responsibilities.map(item => item.trim()))], role: input.role, scope: input.scope, status: input.status, tenantId: input.tenantId };
  }
  private async issue(account: IdentityAccount, session: IdentitySession): Promise<IdentityLoginResult> {
    const accessClaims = this.claims(account, session.id, randomUUID(), "access");
    const refreshClaims = this.claims(account, session.id, session.refreshTokenId, "refresh");
    return {
      accessToken: await this.sign(accessClaims, "15m"),
      claims: accessClaims,
      refreshToken: await this.sign(refreshClaims, "30d"),
    };
  }

  private isSetupActive(): boolean {
    const expiresAt = Date.parse(this.setup.expiresAt);
    return this.setup.enabled && this.setup.bootstrapPassword.length >= 8 && this.setup.code.length >= minimumSetupCodeLength && Number.isFinite(expiresAt) && expiresAt > Date.now();
  }

  private isPasswordResetActive(): boolean {
    const expiresAt = Date.parse(this.passwordReset.expiresAt);
    return this.passwordReset.enabled && this.passwordReset.code.length >= minimumSetupCodeLength && Number.isFinite(expiresAt) && expiresAt > Date.now();
  }

  private claims(account: IdentityAccount, sessionId: string, tokenId: string, type: IdentityClaims["type"]): IdentityClaims {
    return identityClaimsSchema.parse({
      appIds: account.applicationIds, aud: "codexsun-platform", iat: Math.floor(Date.now() / 1_000), iss: "codexsun-identity",
      jti: tokenId, permissions: account.permissions, scope: account.scope, sid: sessionId, sub: account.id, tenantId: account.tenantId, type,
    });
  }

  private async sign(claims: IdentityClaims, expiresIn: string): Promise<string> {
    const key = await this.keys.resolve(this.keys.keyId);
    if (!key) throw new Error("Identity signing key is unavailable.");
    return new SignJWT(claims).setProtectedHeader({ alg: "HS256", kid: this.keys.keyId }).setExpirationTime(expiresIn).sign(key);
  }

  private async verify(token: string, expectedType: IdentityClaims["type"]): Promise<IdentityClaims> {
    const result = await jwtVerify(token, async (header) => {
      if (!header.kid) throw new Error("Identity token has no key id.");
      const key = await this.keys.resolve(header.kid);
      if (!key) throw new Error("Identity token key is unavailable.");
      return key;
    }, { audience: "codexsun-platform", issuer: "codexsun-identity" });
    const claims = identityClaimsSchema.parse(result.payload);
    if (claims.type !== expectedType) throw new Error("Identity token type is invalid.");
    return claims;
  }

  private async publish(type: "identity.login" | "identity.refresh" | "identity.revoked", actorId: string, sessionId: string): Promise<void> {
    await this.events.publish({ actorId, occurredAt: new Date().toISOString(), sessionId, type });
  }
}

export function staticTokenKeyResolver(secret: string, keyId = "identity-v1"): IdentityTokenKeyResolver {
  const key = encoder.encode(secret);
  return { keyId, async resolve(requestedKeyId) { return requestedKeyId === keyId ? key : undefined; } };
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("base64url");
  const hash = await scrypt(password, salt, 64) as Buffer;
  return `${salt}:${hash.toString("base64url")}`;
}

async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [salt, stored] = encoded.split(":");
  if (!salt || !stored) return false;
  const expected = Buffer.from(stored, "base64url");
  const actual = await scrypt(password, salt, expected.length) as Buffer;
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function matchesSecret(value: string, expected: string): boolean {
  const supplied = Buffer.from(value);
  const configured = Buffer.from(expected);
  return supplied.length === configured.length && timingSafeEqual(supplied, configured);
}

function toManagedAccount(account: IdentityAccount): ManagedIdentityAccount {
  const { passwordHash: _passwordHash, ...managed } = account;
  return { ...managed, responsibilities: account.responsibilities ?? [], role: account.role ?? "member", status: account.status ?? "active" };
}

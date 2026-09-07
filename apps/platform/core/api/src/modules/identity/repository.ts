import type { IdentityAccount, IdentitySession } from "./types.js";
import type { Kysely } from "kysely";
import type { PlatformDatabaseSchema } from "../../database/schema.js";

export interface IdentityRepository {
  createAccount(account: IdentityAccount): Promise<void>;
  replacePassword(id: string, expectedHash: string, passwordHash: string): Promise<boolean>;
  updateAccount(account: IdentityAccount): Promise<void>;
  revokeAccountSessions(accountId: string): Promise<void>;
  listAccounts(): Promise<IdentityAccount[]>;
  findAccountById(id: string): Promise<IdentityAccount | undefined>;
  findAccountByLogin(login: string): Promise<IdentityAccount | undefined>;
  findSession(id: string): Promise<IdentitySession | undefined>;
  saveSession(session: IdentitySession): Promise<void>;
}

export class MemoryIdentityRepository implements IdentityRepository {
  readonly #accounts = new Map<string, IdentityAccount>();
  readonly #accountsById = new Map<string, IdentityAccount>();
  readonly #sessions = new Map<string, IdentitySession>();

  constructor(accounts: readonly IdentityAccount[] = []) {
    for (const account of accounts) this.store(account);
  }

  async createAccount(account: IdentityAccount): Promise<void> {
    if (this.#accounts.has(account.login.toLowerCase())) throw new Error("Identity login already exists.");
    this.store(account);
  }
  async replacePassword(id: string, expectedHash: string, passwordHash: string): Promise<boolean> {
    const account = this.#accountsById.get(id);
    if (!account || account.passwordHash !== expectedHash) return false;
    account.passwordHash = passwordHash;
    await this.revokeAccountSessions(id);
    return true;
  }
  async updateAccount(account: IdentityAccount): Promise<void> { this.store(account); }
  async revokeAccountSessions(accountId: string): Promise<void> {
    for (const session of this.#sessions.values()) if (session.accountId === accountId) session.revokedAt = new Date().toISOString();
  }
  async findAccountById(id: string): Promise<IdentityAccount | undefined> { return this.#accountsById.get(id); }
  async listAccounts(): Promise<IdentityAccount[]> { return [...this.#accountsById.values()]; }
  async findAccountByLogin(login: string): Promise<IdentityAccount | undefined> { return this.#accounts.get(login.toLowerCase()); }
  async findSession(id: string): Promise<IdentitySession | undefined> { return this.#sessions.get(id); }
  async saveSession(session: IdentitySession): Promise<void> { this.#sessions.set(session.id, session); }

  private store(account: IdentityAccount) {
    const normalized = { ...account, login: account.login.toLowerCase() };
    this.#accounts.set(normalized.login, normalized);
    this.#accountsById.set(normalized.id, normalized);
  }
}

export class KyselyIdentityRepository implements IdentityRepository {
  constructor(private readonly database: Kysely<PlatformDatabaseSchema>) {}

  async createAccount(account: IdentityAccount): Promise<void> {
    await this.database.insertInto("identity_accounts").values({ id: account.id, ...accountValues(account) }).execute();
  }
  async replacePassword(id: string, expectedHash: string, passwordHash: string): Promise<boolean> {
    return this.database.transaction().execute(async transaction => {
      const result = await transaction.updateTable("identity_accounts").set({ password_hash: passwordHash }).where("id", "=", id).where("password_hash", "=", expectedHash).executeTakeFirst();
      if (result.numUpdatedRows !== 1n) return false;
      await transaction.deleteFrom("identity_sessions").where("account_id", "=", id).execute();
      return true;
    });
  }
  async updateAccount(account: IdentityAccount): Promise<void> {
    await this.database.updateTable("identity_accounts").set(accountValues(account)).where("id", "=", account.id).execute();
  }
  async revokeAccountSessions(accountId: string): Promise<void> { await this.database.deleteFrom("identity_sessions").where("account_id", "=", accountId).execute(); }
  async listAccounts(): Promise<IdentityAccount[]> { return (await this.database.selectFrom("identity_accounts").selectAll().execute()).map(toAccount); }
  async findAccountById(id: string): Promise<IdentityAccount | undefined> { const row = await this.database.selectFrom("identity_accounts").selectAll().where("id", "=", id).executeTakeFirst(); return row && toAccount(row); }
  async findAccountByLogin(login: string): Promise<IdentityAccount | undefined> { const row = await this.database.selectFrom("identity_accounts").selectAll().where("login", "=", login.toLowerCase()).executeTakeFirst(); return row && toAccount(row); }
  async findSession(id: string): Promise<IdentitySession | undefined> { const row = await this.database.selectFrom("identity_sessions").selectAll().where("id", "=", id).executeTakeFirst(); return row && { accountId: row.account_id, id: row.id, refreshTokenId: row.refresh_token_id, revokedAt: row.revoked_at ?? undefined }; }
  async saveSession(session: IdentitySession): Promise<void> { const revokedAt = session.revokedAt ? dateValue(session.revokedAt) : null; await this.database.insertInto("identity_sessions").values({ account_id: session.accountId, id: session.id, refresh_token_id: session.refreshTokenId, revoked_at: revokedAt }).onDuplicateKeyUpdate({ refresh_token_id: session.refreshTokenId, revoked_at: revokedAt }).execute(); }
}

function accountValues(account: IdentityAccount) {
  return { application_ids: JSON.stringify(account.applicationIds), login: account.login.toLowerCase(), password_hash: account.passwordHash, permissions: JSON.stringify(account.permissions), responsibilities: JSON.stringify(account.responsibilities ?? []), role: account.role ?? "member", scope: account.scope, status: account.status ?? "active", tenant_id: account.tenantId ?? null };
}
function toAccount(row: PlatformDatabaseSchema["identity_accounts"]): IdentityAccount {
  return { applicationIds: identityStringArray(row.application_ids), id: row.id, login: row.login, passwordHash: row.password_hash, permissions: identityStringArray(row.permissions), responsibilities: identityStringArray(row.responsibilities), role: row.role as IdentityAccount["role"], scope: row.scope, status: row.status, tenantId: row.tenant_id ?? undefined };
}
function dateValue(value: string): string { return new Date(value).toISOString().slice(0, 19).replace("T", " "); }
export function identityStringArray(value: unknown): string[] { const parsed: unknown = typeof value === "string" ? JSON.parse(value) : value; if (!Array.isArray(parsed) || !parsed.every(item => typeof item === "string")) throw new Error("Invalid stored identity access data."); return parsed; }

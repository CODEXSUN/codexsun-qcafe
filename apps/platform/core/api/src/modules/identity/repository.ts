import type { IdentityAccount, IdentitySession } from "./types.js";
import type { Kysely } from "kysely";
import type { PlatformDatabaseSchema } from "../../database/schema.js";

export interface IdentityRepository {
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
    for (const account of accounts) {
      this.#accounts.set(account.login.toLowerCase(), account);
      this.#accountsById.set(account.id, account);
    }
  }

  async findAccountById(id: string): Promise<IdentityAccount | undefined> { return this.#accountsById.get(id); }

  async findAccountByLogin(login: string): Promise<IdentityAccount | undefined> {
    return this.#accounts.get(login.toLowerCase());
  }

  async findSession(id: string): Promise<IdentitySession | undefined> {
    return this.#sessions.get(id);
  }

  async saveSession(session: IdentitySession): Promise<void> {
    this.#sessions.set(session.id, session);
  }
}

export class KyselyIdentityRepository implements IdentityRepository {
  constructor(private readonly database: Kysely<PlatformDatabaseSchema>) {}

  async findAccountById(id: string): Promise<IdentityAccount | undefined> {
    const row = await this.database.selectFrom("identity_accounts").selectAll().where("id", "=", id).executeTakeFirst();
    return row && toAccount(row);
  }

  async findAccountByLogin(login: string): Promise<IdentityAccount | undefined> {
    const row = await this.database.selectFrom("identity_accounts").selectAll().where("login", "=", login.toLowerCase()).executeTakeFirst();
    return row && toAccount(row);
  }

  async findSession(id: string): Promise<IdentitySession | undefined> {
    const row = await this.database.selectFrom("identity_sessions").selectAll().where("id", "=", id).executeTakeFirst();
    return row && { accountId: row.account_id, id: row.id, refreshTokenId: row.refresh_token_id, revokedAt: row.revoked_at ?? undefined };
  }

  async saveSession(session: IdentitySession): Promise<void> {
    await this.database.insertInto("identity_sessions").values({ account_id: session.accountId, id: session.id, refresh_token_id: session.refreshTokenId, revoked_at: session.revokedAt ?? null }).onDuplicateKeyUpdate({ refresh_token_id: session.refreshTokenId, revoked_at: session.revokedAt ?? null }).execute();
  }
}

function toAccount(row: PlatformDatabaseSchema["identity_accounts"]): IdentityAccount {
  return { applicationIds: JSON.parse(row.application_ids) as string[], id: row.id, login: row.login, passwordHash: row.password_hash, permissions: JSON.parse(row.permissions) as string[], scope: row.scope, tenantId: row.tenant_id ?? undefined };
}

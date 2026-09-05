import { Kysely, SqliteDialect } from "kysely";
import Database from "better-sqlite3";
import type { AppOverrideRecord, AppRegistryDatabaseSchema } from "./app-registry.types.js";
import { migrateAppRegistry } from "./app-registry.migration.js";

export interface AppRegistryRepository {
  deleteOverride(applicationId: string): Promise<void>;
  findOverride(applicationId: string): Promise<AppOverrideRecord | undefined>;
  listOverrides(): Promise<AppOverrideRecord[]>;
  saveOverride(record: AppOverrideRecord): Promise<void>;
  saveOverrides(records: readonly AppOverrideRecord[]): Promise<void>;
}

export class MemoryAppRegistryRepository implements AppRegistryRepository {
  readonly #overrides = new Map<string, AppOverrideRecord>();

  constructor(initial: readonly AppOverrideRecord[] = []) {
    for (const record of initial) {
      this.#overrides.set(record.application_id, { ...record });
    }
  }

  async findOverride(applicationId: string): Promise<AppOverrideRecord | undefined> {
    const record = this.#overrides.get(applicationId);
    return record ? { ...record } : undefined;
  }

  async listOverrides(): Promise<AppOverrideRecord[]> {
    return [...this.#overrides.values()].map((item) => ({ ...item }));
  }

  async saveOverride(record: AppOverrideRecord): Promise<void> {
    this.#overrides.set(record.application_id, { ...record });
  }

  async saveOverrides(records: readonly AppOverrideRecord[]): Promise<void> {
    for (const record of records) {
      this.#overrides.set(record.application_id, { ...record });
    }
  }

  async deleteOverride(applicationId: string): Promise<void> {
    this.#overrides.delete(applicationId);
  }
}

export class KyselyAppRegistryRepository implements AppRegistryRepository {
  constructor(private readonly database: Kysely<AppRegistryDatabaseSchema>) {}

  async findOverride(applicationId: string): Promise<AppOverrideRecord | undefined> {
    const row = await this.database
      .selectFrom("platform_app_overrides")
      .selectAll()
      .where("application_id", "=", applicationId)
      .executeTakeFirst();
    return row;
  }

  async listOverrides(): Promise<AppOverrideRecord[]> {
    return this.database.selectFrom("platform_app_overrides").selectAll().execute();
  }

  async saveOverride(record: AppOverrideRecord): Promise<void> {
    await this.database.transaction().execute(async (transaction) => {
      const existing = await transaction
        .selectFrom("platform_app_overrides")
        .select("id")
        .where("application_id", "=", record.application_id)
        .executeTakeFirst();

      if (existing) {
        await transaction
          .updateTable("platform_app_overrides")
          .set({
            display_name: record.display_name,
            notes: record.notes,
            state: record.state,
            updated_at: record.updated_at,
            updated_by: record.updated_by,
          })
          .where("application_id", "=", record.application_id)
          .execute();
      } else {
        await transaction.insertInto("platform_app_overrides").values(record).execute();
      }
    });
  }

  async saveOverrides(records: readonly AppOverrideRecord[]): Promise<void> {
    await this.database.transaction().execute(async (transaction) => {
      for (const record of records) {
        const existing = await transaction
          .selectFrom("platform_app_overrides")
          .select("id")
          .where("application_id", "=", record.application_id)
          .executeTakeFirst();

        if (existing) {
          await transaction
            .updateTable("platform_app_overrides")
            .set({
              display_name: record.display_name,
              notes: record.notes,
              state: record.state,
              updated_at: record.updated_at,
              updated_by: record.updated_by,
            })
            .where("application_id", "=", record.application_id)
            .execute();
        } else {
          await transaction.insertInto("platform_app_overrides").values(record).execute();
        }
      }
    });
  }

  async deleteOverride(applicationId: string): Promise<void> {
    await this.database
      .deleteFrom("platform_app_overrides")
      .where("application_id", "=", applicationId)
      .execute();
  }
}

/**
 * Creates a standalone Kysely instance connected to a local SQLite database,
 * automatically applying the app registry migration.
 */
export async function createSqliteAppRegistryDatabase(
  databasePathOrMemory: string = ":memory:"
): Promise<Kysely<AppRegistryDatabaseSchema>> {
  const sqlite = new Database(databasePathOrMemory);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const database = new Kysely<AppRegistryDatabaseSchema>({
    dialect: new SqliteDialect({
      database: sqlite,
    }),
  });
  await migrateAppRegistry(database);
  return database;
}

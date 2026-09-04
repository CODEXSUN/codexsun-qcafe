import type { Kysely } from "kysely";
import type { PlatformDatabaseSchema } from "./schema.js";

export type PlatformMigration = {
  name: string;
  up: (database: Kysely<PlatformDatabaseSchema>) => Promise<void>;
};

const migrations: readonly PlatformMigration[] = [
  {
    name: "identity.foundation.v1",
    async up(database) {
      await database.schema.createTable("identity_accounts").ifNotExists()
        .addColumn("id", "varchar(36)", (column) => column.primaryKey())
        .addColumn("login", "varchar(191)", (column) => column.notNull().unique())
        .addColumn("password_hash", "varchar(255)", (column) => column.notNull())
        .addColumn("scope", "varchar(24)", (column) => column.notNull())
        .addColumn("tenant_id", "varchar(36)")
        .addColumn("permissions", "json", (column) => column.notNull())
        .addColumn("application_ids", "json", (column) => column.notNull()).execute();
      await database.schema.createTable("identity_sessions").ifNotExists()
        .addColumn("id", "varchar(36)", (column) => column.primaryKey())
        .addColumn("account_id", "varchar(36)", (column) => column.notNull().references("identity_accounts.id"))
        .addColumn("refresh_token_id", "varchar(36)", (column) => column.notNull())
        .addColumn("revoked_at", "datetime").execute();
    },
  },
  {
    name: "platform.persistence.v1",
    async up(database) {
      await database.schema
        .createTable("platform_events")
        .ifNotExists()
        .addColumn("id", "varchar(36)", (column) => column.primaryKey())
        .addColumn("event_type", "varchar(120)", (column) => column.notNull())
        .addColumn("payload", "json", (column) => column.notNull())
        .addColumn("created_at", "datetime", (column) => column.notNull())
        .execute();
      await database.schema
        .createTable("platform_outbox")
        .ifNotExists()
        .addColumn("id", "varchar(36)", (column) => column.primaryKey())
        .addColumn("event_id", "varchar(36)", (column) => column.notNull().references("platform_events.id"))
        .addColumn("topic", "varchar(120)", (column) => column.notNull())
        .addColumn("payload", "json", (column) => column.notNull())
        .addColumn("state", "varchar(24)", (column) => column.notNull())
        .addColumn("attempts", "integer", (column) => column.notNull().defaultTo(0))
        .addColumn("available_at", "datetime", (column) => column.notNull())
        .addColumn("created_at", "datetime", (column) => column.notNull())
        .addColumn("updated_at", "datetime", (column) => column.notNull())
        .execute();
      await database.schema
        .createIndex("platform_outbox_state_available_idx")
        .ifNotExists()
        .on("platform_outbox")
        .columns(["state", "available_at"])
        .execute();
    },
  },
];

export async function migratePlatformDatabase(database: Kysely<PlatformDatabaseSchema>): Promise<string[]> {
  await database.schema
    .createTable("platform_migrations")
    .ifNotExists()
    .addColumn("name", "varchar(191)", (column) => column.primaryKey())
    .addColumn("applied_at", "datetime", (column) => column.notNull())
    .execute();

  const applied = new Set((await database.selectFrom("platform_migrations").select("name").execute()).map((row) => row.name));
  const completed: string[] = [];
  for (const migration of migrations) {
    if (applied.has(migration.name)) continue;
    await database.transaction().execute(async (transaction) => {
      await migration.up(transaction);
      await transaction.insertInto("platform_migrations").values({ applied_at: timestamp(), name: migration.name }).execute();
    });
    completed.push(migration.name);
  }
  return completed;
}

function timestamp(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

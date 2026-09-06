import { sql, type Kysely } from "kysely";
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
    name: "identity.access-management.v1",
    async up(database) {
      await database.schema.alterTable("identity_accounts").addColumn("role", "varchar(32)", column => column.notNull().defaultTo("member")).execute();
      await database.schema.alterTable("identity_accounts").addColumn("responsibilities", "json", column => column.notNull().defaultTo("[]")).execute();
      await database.schema.alterTable("identity_accounts").addColumn("status", "varchar(16)", column => column.notNull().defaultTo("active")).execute();
    },
  },
  {
    name: "identity.access-management.v2",
    async up(database) {
      await sql`UPDATE identity_accounts SET role = 'administrator' WHERE JSON_CONTAINS(permissions, JSON_QUOTE('identity.admin')) = 1`.execute(database);
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
  {
    name: "platform.app-registry.v1",
    async up(database) {
      await database.schema
        .createTable("platform_app_overrides")
        .ifNotExists()
        .addColumn("id", "varchar(64)", (column) => column.primaryKey())
        .addColumn("application_id", "varchar(64)", (column) => column.notNull())
        .addColumn("state", "varchar(24)", (column) => column.notNull())
        .addColumn("display_name", "varchar(128)")
        .addColumn("notes", "text")
        .addColumn("updated_at", "varchar(32)", (column) => column.notNull())
        .addColumn("updated_by", "varchar(128)", (column) => column.notNull())
        .execute();
    },
  },
  {
    name: "docs.pages.v1",
    async up(database) {
      await sql`CREATE TABLE IF NOT EXISTS docs_pages (
        slug VARCHAR(160) PRIMARY KEY,
        title VARCHAR(240) NOT NULL,
        summary VARCHAR(360) NOT NULL,
        page_group VARCHAR(80) NOT NULL,
        body MEDIUMTEXT NOT NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        updated_by VARCHAR(254) NOT NULL
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`.execute(database);
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

import type { Kysely } from "kysely";
import type { AppRegistryDatabaseSchema } from "./app-registry.types.js";

export const appRegistryMigrationName = "platform.app-registry.v1";

export async function migrateAppRegistry(database: Kysely<AppRegistryDatabaseSchema>): Promise<void> {
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
}

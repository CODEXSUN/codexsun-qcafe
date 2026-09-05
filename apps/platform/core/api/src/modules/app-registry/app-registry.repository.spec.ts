import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { unlinkSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  createSqliteAppRegistryDatabase,
  KyselyAppRegistryRepository,
} from "./app-registry.repository.js";
import type { AppOverrideRecord } from "./app-registry.types.js";

const testDbPath = resolve(process.cwd(), "temp-test-app-registry.sqlite");

describe("KyselyAppRegistryRepository with SQLite", () => {
  beforeEach(() => {
    if (existsSync(testDbPath)) unlinkSync(testDbPath);
  });

  afterEach(() => {
    if (existsSync(testDbPath)) unlinkSync(testDbPath);
  });

  it("applies migrations and performs CRUD with transactions", async () => {
    const db = await createSqliteAppRegistryDatabase(":memory:");
    const repository = new KyselyAppRegistryRepository(db);

    const record: AppOverrideRecord = {
      application_id: "app.devkit",
      display_name: "DevKit Custom",
      id: "app.devkit",
      notes: "Custom notes",
      state: "active",
      updated_at: new Date().toISOString(),
      updated_by: "user-1",
    };

    await repository.saveOverride(record);

    const fetched = await repository.findOverride("app.devkit");
    expect(fetched).toBeDefined();
    expect(fetched!.display_name).toBe("DevKit Custom");
    expect(fetched!.state).toBe("active");

    // Update with saveOverride
    await repository.saveOverride({
      ...record,
      display_name: "DevKit Updated",
      state: "disabled",
    });

    const updated = await repository.findOverride("app.devkit");
    expect(updated!.display_name).toBe("DevKit Updated");
    expect(updated!.state).toBe("disabled");

    // Delete
    await repository.deleteOverride("app.devkit");
    expect(await repository.findOverride("app.devkit")).toBeUndefined();

    await db.destroy();
  });

  it("persists records across database restart (restart-persistence test)", async () => {
    // 1. First session: create database on disk, write record, and close database connection
    const db1 = await createSqliteAppRegistryDatabase(testDbPath);
    const repo1 = new KyselyAppRegistryRepository(db1);

    await repo1.saveOverride({
      application_id: "app.zetro",
      display_name: "Zetro Workspace",
      id: "app.zetro",
      notes: "Restart persistence check",
      state: "active",
      updated_at: new Date().toISOString(),
      updated_by: "system",
    });

    await db1.destroy();

    // 2. Second session: reopen database from existing disk file
    const db2 = await createSqliteAppRegistryDatabase(testDbPath);
    const repo2 = new KyselyAppRegistryRepository(db2);

    const fetched = await repo2.findOverride("app.zetro");
    expect(fetched).toBeDefined();
    expect(fetched!.display_name).toBe("Zetro Workspace");
    expect(fetched!.notes).toBe("Restart persistence check");

    await db2.destroy();
  });

  it("executes multi-record changes inside atomic transactions", async () => {
    const db = await createSqliteAppRegistryDatabase(":memory:");
    const repository = new KyselyAppRegistryRepository(db);

    const records: AppOverrideRecord[] = [
      {
        application_id: "app.devkit",
        display_name: "DevKit Batch",
        id: "app.devkit",
        notes: "Batch item 1",
        state: "active",
        updated_at: new Date().toISOString(),
        updated_by: "user-batch",
      },
      {
        application_id: "app.q-cafe",
        display_name: "Q Cafe Batch",
        id: "app.q-cafe",
        notes: "Batch item 2",
        state: "disabled",
        updated_at: new Date().toISOString(),
        updated_by: "user-batch",
      },
    ];

    await repository.saveOverrides(records);

    const list = await repository.listOverrides();
    expect(list.length).toBe(2);
    expect(list.map((r) => r.application_id).sort()).toEqual(["app.devkit", "app.q-cafe"]);

    await db.destroy();
  });
});

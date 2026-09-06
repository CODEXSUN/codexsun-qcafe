import Database from "better-sqlite3";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { WorkspaceStore } from "./workspace-store.js";

it("migrates legacy settings once and preserves JSON settings across restart", () => {
  const directory = mkdtempSync(join(tmpdir(), "zetro-settings-"));
  const file = join(directory, "workspace.db");
  const defaults = { repositoryRoot: directory, githubUrl: "", enabledAgentIds: ["zxa"], defaultAgentId: "zxa", runtimeTarget: "docker-local" as const, vpsAgentUrl: "" };
  try {
    const legacy = new Database(file);
    legacy.exec("CREATE TABLE zetro_settings (id TEXT PRIMARY KEY, snapshot TEXT NOT NULL, updated_at TEXT NOT NULL)");
    legacy.prepare("INSERT INTO zetro_settings VALUES (?, ?, ?)").run("workspace", JSON.stringify({ ...defaults, githubUrl: "https://example.com/legacy" }), "2026-09-05");
    legacy.close();
    const first = new WorkspaceStore(file, defaults);
    expect(first.settings().githubUrl).toBe("https://example.com/legacy");
    first.saveSettings({ ...defaults, githubUrl: "https://example.com/new" });
    first.close();
    const second = new WorkspaceStore(file, defaults);
    expect(second.settings().githubUrl).toBe("https://example.com/new");
    second.close();
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

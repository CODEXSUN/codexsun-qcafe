import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { JsonSettingsStore } from "./settings-store.js";
import { settingsSchema, type ZetroConversation, type ZetroProject, type ZetroSettings, type ZetroWorkspace } from "./workspace-contracts.js";

export class WorkspaceStore {
  private readonly database: Database.Database;
  private readonly configuration: JsonSettingsStore;
  constructor(file: string, private readonly defaultSettings: ZetroSettings, settingsFile = `${file}.settings.json`) {
    mkdirSync(dirname(file), { recursive: true });
    this.configuration = new JsonSettingsStore(settingsFile);
    this.database = new Database(file);
    this.database.pragma("journal_mode = WAL");
    this.database.exec("CREATE TABLE IF NOT EXISTS zetro_projects (id TEXT PRIMARY KEY, snapshot TEXT NOT NULL, updated_at TEXT NOT NULL); CREATE TABLE IF NOT EXISTS zetro_conversations (id TEXT PRIMARY KEY, snapshot TEXT NOT NULL, updated_at TEXT NOT NULL); CREATE TABLE IF NOT EXISTS zetro_settings (id TEXT PRIMARY KEY, snapshot TEXT NOT NULL, updated_at TEXT NOT NULL);");
    if (!this.configuration.exists()) this.configuration.write(this.legacySettings());
    this.configuration.read();
  }
  snapshot(): ZetroWorkspace { return { projects: this.rows("zetro_projects"), conversations: this.rows("zetro_conversations") }; }
  saveProject(project: ZetroProject) { this.save("zetro_projects", project.id, project); }
  saveConversation(conversation: ZetroConversation) { this.save("zetro_conversations", conversation.id, conversation); }
  deleteConversation(id: string) { this.database.prepare("DELETE FROM zetro_conversations WHERE id = ?").run(id); }
  deleteProject(id: string) {
    const conversations = this.snapshot().conversations.filter((item) => item.projectId === id);
    this.database.transaction(() => {
      for (const conversation of conversations) { const { projectId: _, ...unassigned } = conversation; this.saveConversation(unassigned); }
      this.database.prepare("DELETE FROM zetro_projects WHERE id = ?").run(id);
    })();
  }
  archiveProjectChats(id: string) {
    const conversations = this.snapshot().conversations.filter((item) => item.projectId === id);
    this.database.transaction(() => { for (const conversation of conversations) this.saveConversation({ ...conversation, archived: true }); })();
  }
  settings(): ZetroSettings { return this.configuration.read(); }
  private legacySettings(): ZetroSettings {
    const row = this.database.prepare("SELECT snapshot FROM zetro_settings WHERE id = 'workspace'").get() as { snapshot: string } | undefined;
    const stored = row ? settingsSchema.safeParse(JSON.parse(row.snapshot)) : undefined;
    return stored?.success ? stored.data : this.defaultSettings;
  }
  saveSettings(settings: ZetroSettings) { this.configuration.write(settings); }
  close() { this.database.close(); }
  private rows<T>(table: "zetro_projects" | "zetro_conversations"): T[] { return (this.database.prepare(`SELECT snapshot FROM ${table} ORDER BY updated_at DESC`).all() as { snapshot: string }[]).map((row) => JSON.parse(row.snapshot)); }
  private save(table: "zetro_projects" | "zetro_conversations" | "zetro_settings", id: string, value: unknown) { this.database.prepare(`INSERT INTO ${table} (id, snapshot, updated_at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET snapshot = excluded.snapshot, updated_at = excluded.updated_at`).run(id, JSON.stringify(value), new Date().toISOString()); }
}

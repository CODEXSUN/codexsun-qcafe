import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { OrchestrationRun } from "./run-contracts.js";

export class RunStore {
  private readonly database: DatabaseSync;
  constructor(file: string) {
    mkdirSync(dirname(file), { recursive: true });
    this.database = new DatabaseSync(file);
    this.database.exec("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; CREATE TABLE IF NOT EXISTS orchestration_runs (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, status TEXT NOT NULL, snapshot TEXT NOT NULL); CREATE TABLE IF NOT EXISTS orchestration_events (id INTEGER PRIMARY KEY AUTOINCREMENT, run_id TEXT NOT NULL, occurred_at TEXT NOT NULL, event TEXT NOT NULL, details TEXT NOT NULL, FOREIGN KEY(run_id) REFERENCES orchestration_runs(id));");
  }
  list(): OrchestrationRun[] { return (this.database.prepare("SELECT snapshot FROM orchestration_runs ORDER BY created_at DESC").all() as { snapshot: string }[]).map((row) => JSON.parse(row.snapshot)); }
  get(id: string): OrchestrationRun | undefined { const row = this.database.prepare("SELECT snapshot FROM orchestration_runs WHERE id = ?").get(id) as { snapshot: string } | undefined; return row ? JSON.parse(row.snapshot) : undefined; }
  save(run: OrchestrationRun, event: string, details: Record<string, unknown> = {}) {
    run.updatedAt = new Date().toISOString();
    this.database.exec("BEGIN IMMEDIATE");
    try {
      this.database.prepare("INSERT INTO orchestration_runs (id, created_at, updated_at, status, snapshot) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET updated_at=excluded.updated_at, status=excluded.status, snapshot=excluded.snapshot").run(run.id, run.createdAt, run.updatedAt, run.status, JSON.stringify(run));
      this.database.prepare("INSERT INTO orchestration_events (run_id, occurred_at, event, details) VALUES (?, ?, ?, ?)").run(run.id, run.updatedAt, event, JSON.stringify(details));
      this.database.exec("COMMIT");
    } catch (error) { this.database.exec("ROLLBACK"); throw error; }
  }
  close() { this.database.close(); }
}

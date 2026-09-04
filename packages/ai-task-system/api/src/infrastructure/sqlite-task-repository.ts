import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { aiTaskSchema, type AiTask } from "@codexsun/ai-task-contracts";
import type { TaskRepository } from "../application/ports.js";

export class SqliteTaskRepository implements TaskRepository {
  private readonly database: DatabaseSync;
  constructor(file: string) {
    mkdirSync(dirname(file), { recursive: true }); this.database = new DatabaseSync(file);
    this.database.exec("PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS ai_tasks (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, status TEXT NOT NULL, snapshot TEXT NOT NULL); CREATE TABLE IF NOT EXISTS ai_task_events (id INTEGER PRIMARY KEY AUTOINCREMENT, task_id TEXT NOT NULL, occurred_at TEXT NOT NULL, event TEXT NOT NULL, details TEXT NOT NULL, FOREIGN KEY(task_id) REFERENCES ai_tasks(id));");
  }
  list() { return (this.database.prepare("SELECT snapshot FROM ai_tasks ORDER BY created_at DESC").all() as { snapshot: string }[]).map((row) => aiTaskSchema.parse(JSON.parse(row.snapshot))); }
  get(id: string) { const row = this.database.prepare("SELECT snapshot FROM ai_tasks WHERE id = ?").get(id) as { snapshot: string } | undefined; return row ? aiTaskSchema.parse(JSON.parse(row.snapshot)) : undefined; }
  save(task: AiTask, event: string, details: Record<string, unknown> = {}) {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      this.database.prepare("INSERT INTO ai_tasks (id, created_at, updated_at, status, snapshot) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET updated_at=excluded.updated_at, status=excluded.status, snapshot=excluded.snapshot").run(task.id, task.createdAt, task.updatedAt, task.status, JSON.stringify(task));
      this.database.prepare("INSERT INTO ai_task_events (task_id, occurred_at, event, details) VALUES (?, ?, ?, ?)").run(task.id, task.updatedAt, event, JSON.stringify(details));
      this.database.exec("COMMIT");
    } catch (error) { this.database.exec("ROLLBACK"); throw error; }
  }
  close() { this.database.close(); }
}

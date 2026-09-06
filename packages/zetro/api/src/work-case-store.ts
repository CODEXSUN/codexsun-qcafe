import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { workCaseEventSchema, workCaseSchema, type WorkCase, type WorkCaseEvent, type WorkCaseReferenceKind, type WorkCaseStatus } from "./work-case-contracts.js";

export class WorkCaseStore {
  private readonly database: DatabaseSync;

  constructor(file: string) {
    mkdirSync(dirname(file), { recursive: true });
    this.database = new DatabaseSync(file);
    this.database.exec(`
      PRAGMA journal_mode=WAL;
      PRAGMA foreign_keys=ON;
      CREATE TABLE IF NOT EXISTS zetro_work_cases (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        snapshot TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS zetro_work_case_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        work_case_id TEXT NOT NULL,
        type TEXT NOT NULL,
        details TEXT NOT NULL,
        occurred_at TEXT NOT NULL,
        FOREIGN KEY(work_case_id) REFERENCES zetro_work_cases(id)
      );
      CREATE INDEX IF NOT EXISTS zetro_work_case_events_case
        ON zetro_work_case_events(work_case_id, id);
    `);
  }

  create(request: string, conversationId?: string) {
    const now = new Date().toISOString();
    const workCase: WorkCase = {
      id: randomUUID(), request, status: "open", createdAt: now, updatedAt: now,
      references: conversationId ? [{ kind: "conversation", id: conversationId, createdAt: now }] : [],
    };
    this.save(workCase, "work_case.created", { conversationId });
    return workCase;
  }

  list() {
    return (this.database.prepare("SELECT snapshot FROM zetro_work_cases ORDER BY updated_at DESC").all() as { snapshot: string }[])
      .map((row) => workCaseSchema.parse(JSON.parse(row.snapshot)));
  }

  get(id: string) {
    const row = this.database.prepare("SELECT snapshot FROM zetro_work_cases WHERE id=?").get(id) as { snapshot: string } | undefined;
    return row ? workCaseSchema.parse(JSON.parse(row.snapshot)) : undefined;
  }

  events(id: string) {
    return (this.database.prepare("SELECT id, work_case_id, type, details, occurred_at FROM zetro_work_case_events WHERE work_case_id=? ORDER BY id").all(id) as Array<{ id: number; work_case_id: string; type: string; details: string; occurred_at: string }>)
      .map((row): WorkCaseEvent => workCaseEventSchema.parse({ id: row.id, workCaseId: row.work_case_id, type: row.type, details: JSON.parse(row.details), occurredAt: row.occurred_at }));
  }

  record(id: string, type: string, options: { status?: WorkCaseStatus; reference?: { kind: WorkCaseReferenceKind; id: string }; details?: Record<string, unknown> } = {}) {
    const workCase = this.get(id);
    if (!workCase) throw new Error("Work case was not found.");
    const now = new Date().toISOString();
    if (options.status) workCase.status = options.status;
    if (options.reference && !workCase.references.some((reference) => reference.kind === options.reference?.kind && reference.id === options.reference.id)) {
      workCase.references.push({ ...options.reference, createdAt: now });
    }
    workCase.updatedAt = now;
    this.save(workCase, type, options.details);
    return workCase;
  }

  close() { this.database.close(); }

  private save(workCase: WorkCase, type: string, details: Record<string, unknown> = {}) {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      this.database.prepare("INSERT INTO zetro_work_cases (id,status,created_at,updated_at,snapshot) VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET status=excluded.status,updated_at=excluded.updated_at,snapshot=excluded.snapshot")
        .run(workCase.id, workCase.status, workCase.createdAt, workCase.updatedAt, JSON.stringify(workCase));
      this.database.prepare("INSERT INTO zetro_work_case_events (work_case_id,type,details,occurred_at) VALUES (?,?,?,?)")
        .run(workCase.id, type, JSON.stringify(details), workCase.updatedAt);
      this.database.exec("COMMIT");
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }
}

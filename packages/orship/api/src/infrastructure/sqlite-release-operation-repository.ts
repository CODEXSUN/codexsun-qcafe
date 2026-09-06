import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { releaseOperationEventSchema, releaseOperationReviewEventSchema, releaseOperationReviewSchema, releaseOperationSchema, type ReleaseOperation, type ReleaseOperationReview } from "@codexsun/orship-contracts";
import type { ReleaseOperationRepository } from "../application/ports.js";

export class SqliteReleaseOperationRepository implements ReleaseOperationRepository {
  private readonly database: DatabaseSync;

  constructor(file: string) {
    mkdirSync(dirname(file), { recursive: true });
    this.database = new DatabaseSync(file);
    this.database.exec("PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS release_operations (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, phase TEXT NOT NULL, snapshot TEXT NOT NULL); CREATE TABLE IF NOT EXISTS release_operation_events (id INTEGER PRIMARY KEY AUTOINCREMENT, operation_id TEXT NOT NULL, occurred_at TEXT NOT NULL, event TEXT NOT NULL, details TEXT NOT NULL, FOREIGN KEY(operation_id) REFERENCES release_operations(id)); CREATE TABLE IF NOT EXISTS release_operation_reviews (operation_id TEXT PRIMARY KEY, status TEXT NOT NULL, notes TEXT NOT NULL, reviewed_at TEXT NOT NULL, FOREIGN KEY(operation_id) REFERENCES release_operations(id)); CREATE TABLE IF NOT EXISTS release_operation_review_events (id INTEGER PRIMARY KEY AUTOINCREMENT, operation_id TEXT NOT NULL, status TEXT NOT NULL, notes TEXT NOT NULL, reviewed_at TEXT NOT NULL, FOREIGN KEY(operation_id) REFERENCES release_operations(id)); CREATE INDEX IF NOT EXISTS idx_release_events_operation ON release_operation_events(operation_id, id); CREATE INDEX IF NOT EXISTS idx_release_reviews_operation ON release_operation_review_events(operation_id, id);");
  }

  list() {
    return (this.database.prepare("SELECT snapshot FROM release_operations ORDER BY created_at DESC").all() as { snapshot: string }[])
      .map(row => releaseOperationSchema.parse(JSON.parse(row.snapshot)));
  }

  listEvents(limit: number) {
    return (this.database.prepare("SELECT id, operation_id, occurred_at, event, details FROM release_operation_events ORDER BY id DESC LIMIT ?").all(Math.max(1, Math.min(limit, 100))) as Array<{ id: number; operation_id: string; occurred_at: string; event: string; details: string }>)
      .map(row => releaseOperationEventSchema.parse({ id: row.id, operationId: row.operation_id, occurredAt: row.occurred_at, type: row.event, details: JSON.parse(row.details) }));
  }

  listEventsForOperation(operationId: string) {
    return (this.database.prepare("SELECT id, operation_id, occurred_at, event, details FROM release_operation_events WHERE operation_id = ? ORDER BY id ASC").all(operationId) as Array<{ id: number; operation_id: string; occurred_at: string; event: string; details: string }>)
      .map(row => releaseOperationEventSchema.parse({ id: row.id, operationId: row.operation_id, occurredAt: row.occurred_at, type: row.event, details: JSON.parse(row.details) }));
  }

  get(id: string) {
    const row = this.database.prepare("SELECT snapshot FROM release_operations WHERE id = ?").get(id) as { snapshot: string } | undefined;
    return row ? releaseOperationSchema.parse(JSON.parse(row.snapshot)) : undefined;
  }

  getReview(operationId: string) {
    const row = this.database.prepare("SELECT operation_id, status, notes, reviewed_at FROM release_operation_reviews WHERE operation_id = ?").get(operationId) as { operation_id: string; status: string; notes: string; reviewed_at: string } | undefined;
    return row ? releaseOperationReviewSchema.parse({ operationId: row.operation_id, status: row.status, notes: row.notes, reviewedAt: row.reviewed_at }) : undefined;
  }

  listReviews(operationId: string) {
    return (this.database.prepare("SELECT id, operation_id, status, notes, reviewed_at FROM release_operation_review_events WHERE operation_id = ? ORDER BY id DESC").all(operationId) as Array<{ id: number; operation_id: string; status: string; notes: string; reviewed_at: string }>)
      .map(row => releaseOperationReviewEventSchema.parse({ id: row.id, operationId: row.operation_id, status: row.status, notes: row.notes, reviewedAt: row.reviewed_at }));
  }

  saveReview(review: ReleaseOperationReview) {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      this.database.prepare("INSERT INTO release_operation_reviews (operation_id, status, notes, reviewed_at) VALUES (?, ?, ?, ?) ON CONFLICT(operation_id) DO UPDATE SET status=excluded.status, notes=excluded.notes, reviewed_at=excluded.reviewed_at")
        .run(review.operationId, review.status, review.notes, review.reviewedAt);
      this.database.prepare("INSERT INTO release_operation_review_events (operation_id, status, notes, reviewed_at) VALUES (?, ?, ?, ?)")
        .run(review.operationId, review.status, review.notes, review.reviewedAt);
      this.database.exec("COMMIT");
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }

  save(operation: ReleaseOperation, event: string, details: Record<string, unknown> = {}) {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      this.database.prepare("INSERT INTO release_operations (id, created_at, updated_at, phase, snapshot) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET updated_at=excluded.updated_at, phase=excluded.phase, snapshot=excluded.snapshot")
        .run(operation.id, operation.createdAt, operation.updatedAt, operation.phase, JSON.stringify(operation));
      this.database.prepare("INSERT INTO release_operation_events (operation_id, occurred_at, event, details) VALUES (?, ?, ?, ?)")
        .run(operation.id, operation.updatedAt, event, JSON.stringify(details));
      this.database.exec("COMMIT");
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }

  close() { this.database.close(); }
}

import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

export type KnowledgeKind = "prompt" | "plan" | "task" | "evidence" | "learning-proposal" | "index" | "bug" | "tuning-proposal";
export type KnowledgeRecord = { id: string; kind: KnowledgeKind; scope: string; summary: string; payload: Record<string, unknown>; createdAt: string };
export type ProposalReview = { recordId: string; status: "accepted" | "rejected"; notes: string; reviewedAt: string };

export class KnowledgeLoop {
  readonly database: DatabaseSync;
  readonly vault: string;
  constructor(file: string) {
    mkdirSync(dirname(file), { recursive: true });
    this.vault = join(dirname(file), "vault"); mkdirSync(this.vault, { recursive: true });
    this.database = new DatabaseSync(file);
    this.database.exec("PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS zetro_knowledge_records (id TEXT PRIMARY KEY, kind TEXT NOT NULL, scope TEXT NOT NULL, summary TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL); CREATE INDEX IF NOT EXISTS zetro_knowledge_search ON zetro_knowledge_records(scope, kind, created_at); CREATE TABLE IF NOT EXISTS zetro_knowledge_queue (id TEXT PRIMARY KEY, kind TEXT NOT NULL, payload TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL, completed_at TEXT, error TEXT); CREATE TABLE IF NOT EXISTS zetro_knowledge_reviews (record_id TEXT PRIMARY KEY, status TEXT NOT NULL, notes TEXT NOT NULL, reviewed_at TEXT NOT NULL, FOREIGN KEY(record_id) REFERENCES zetro_knowledge_records(id));");
  }
  record(kind: KnowledgeKind, scope: string, summary: string, payload: Record<string, unknown> = {}) {
    const record: KnowledgeRecord = { id: randomUUID(), kind, scope, summary: compact(summary, 1000), payload, createdAt: new Date().toISOString() };
    this.database.prepare("INSERT INTO zetro_knowledge_records VALUES (?, ?, ?, ?, ?, ?)").run(record.id, record.kind, record.scope, record.summary, JSON.stringify(record.payload), record.createdAt);
    if (record.kind !== "index") this.writeNote(record);
    return record;
  }
  enqueue(kind: KnowledgeKind, payload: Record<string, unknown>) {
    const id = randomUUID(); const createdAt = new Date().toISOString();
    this.database.prepare("INSERT INTO zetro_knowledge_queue (id, kind, payload, status, created_at) VALUES (?, ?, ?, 'queued', ?)").run(id, kind, JSON.stringify(payload), createdAt);
    return id;
  }
  drain(scope = "project") {
    const jobs = this.database.prepare("SELECT id, kind, payload FROM zetro_knowledge_queue WHERE status = 'queued' ORDER BY created_at LIMIT 100").all() as { id: string; kind: KnowledgeKind; payload: string }[];
    for (const job of jobs) {
      try { const payload = JSON.parse(job.payload) as Record<string, unknown>; this.record(job.kind, scope, String(payload.summary ?? job.kind), payload); this.database.prepare("UPDATE zetro_knowledge_queue SET status='completed', completed_at=? WHERE id=?").run(new Date().toISOString(), job.id); }
      catch (error) { this.database.prepare("UPDATE zetro_knowledge_queue SET status='failed', error=? WHERE id=?").run(error instanceof Error ? error.message : "Queue job failed.", job.id); }
    }
    return jobs.length;
  }
  search(scope: string, query: string, limit = 12) {
    const needle = `%${query.trim().replace(/[%_]/gu, "")}%`;
    return (this.database.prepare("SELECT id, kind, scope, summary, payload, created_at FROM zetro_knowledge_records WHERE scope=? AND summary LIKE ? ORDER BY created_at DESC LIMIT ?").all(scope, needle, Math.min(limit, 50)) as { id: string; kind: KnowledgeKind; scope: string; summary: string; payload: string; created_at: string }[]).map(row => ({ id: row.id, kind: row.kind, scope: row.scope, summary: row.summary, payload: JSON.parse(row.payload), createdAt: row.created_at }));
  }
  recall(scope: string, query: string, limit = 8) {
    const terms = [...new Set(query.toLowerCase().match(/[a-z0-9][a-z0-9_-]{2,}/gu) ?? [])].filter((term) => !STOP_WORDS.has(term)).slice(0, 12);
    if (!terms.length) return [];
    const records = this.database.prepare("SELECT r.id, r.kind, r.scope, r.summary, r.payload, r.created_at, v.status AS review_status FROM zetro_knowledge_records r LEFT JOIN zetro_knowledge_reviews v ON v.record_id=r.id WHERE r.scope=? AND (r.kind NOT IN ('learning-proposal','tuning-proposal') OR v.status='accepted') ORDER BY r.created_at DESC LIMIT 500").all(scope) as Array<{ id: string; kind: KnowledgeKind; scope: string; summary: string; payload: string; created_at: string; review_status?: string }>;
    return records.map((row) => ({ row, score: terms.reduce((score, term) => score + (row.summary.toLowerCase().includes(term) ? 1 : 0), 0) }))
      .filter(({ score }) => score > 0)
      .sort((left, right) => right.score - left.score || right.row.created_at.localeCompare(left.row.created_at))
      .slice(0, Math.min(limit, 20))
      .map(({ row }) => ({ id: row.id, kind: row.kind, scope: row.scope, summary: row.summary, payload: JSON.parse(row.payload), createdAt: row.created_at }));
  }
  listProposals(scope = "project") {
    const rows = this.database.prepare("SELECT r.id, r.kind, r.scope, r.summary, r.payload, r.created_at, v.status, v.notes, v.reviewed_at FROM zetro_knowledge_records r LEFT JOIN zetro_knowledge_reviews v ON v.record_id=r.id WHERE r.scope=? AND r.kind IN ('learning-proposal','tuning-proposal') ORDER BY r.created_at DESC").all(scope) as Array<{ id: string; kind: KnowledgeKind; scope: string; summary: string; payload: string; created_at: string; status?: ProposalReview["status"]; notes?: string; reviewed_at?: string }>;
    return rows.map((row) => ({ id: row.id, kind: row.kind, scope: row.scope, summary: row.summary, payload: JSON.parse(row.payload), createdAt: row.created_at, review: row.status ? { recordId: row.id, status: row.status, notes: row.notes ?? "", reviewedAt: row.reviewed_at } : null }));
  }
  reviewProposal(recordId: string, status: ProposalReview["status"], notes: string) {
    const record = this.database.prepare("SELECT kind FROM zetro_knowledge_records WHERE id=?").get(recordId) as { kind: KnowledgeKind } | undefined;
    if (!record || !["learning-proposal", "tuning-proposal"].includes(record.kind)) throw new Error("Learning proposal was not found.");
    const review: ProposalReview = { recordId, status, notes: compact(notes, 4000), reviewedAt: new Date().toISOString() };
    this.database.prepare("INSERT INTO zetro_knowledge_reviews (record_id,status,notes,reviewed_at) VALUES (?,?,?,?) ON CONFLICT(record_id) DO UPDATE SET status=excluded.status,notes=excluded.notes,reviewed_at=excluded.reviewed_at").run(review.recordId, review.status, review.notes, review.reviewedAt);
    return review;
  }
  index(root: string, scope = "project") {
    const absolute = resolve(root); if (!existsSync(absolute) || !statSync(absolute).isDirectory()) throw new Error("Choose an existing project directory.");
    const files: string[] = []; visit(absolute, 0); for (const path of files) { const text = readFileSync(path, "utf8"); const file = relative(absolute, path).replaceAll("\\", "/"); this.record("index", scope, `${file}: ${compact(text.replace(/\s+/gu, " "), 280)}`, { file, hash: createHash("sha256").update(text).digest("hex").slice(0, 16) }); }
    return { indexed: files.length };
    function visit(folder: string, depth: number) { if (depth > 4 || files.length >= 400) return; for (const entry of readdirSync(folder, { withFileTypes: true })) { if (entry.isDirectory()) { if (!entry.name.startsWith(".") && !["node_modules", "dist", "target", "coverage"].includes(entry.name)) visit(join(folder, entry.name), depth + 1); } else if (["README.md", "package.json", "manifest.json", "AGENTS.md", "SKILL.md"].includes(entry.name) || entry.name.endsWith(".md")) files.push(join(folder, entry.name)); } }
  }
  close() { this.database.close(); }
  private writeNote(record: KnowledgeRecord) {
    const folder = join(this.vault, record.kind === "bug" ? "08-bugs" : record.kind.includes("proposal") ? "06-learning-proposals" : "05-runs");
    mkdirSync(folder, { recursive: true });
    const note = `---\nid: ${record.id}\ntype: ${record.kind}\nscope: ${record.scope}\ncreatedAt: ${record.createdAt}\nstatus: ${record.kind.includes("proposal") ? "pending-review" : "recorded"}\n---\n\n# ${record.summary}\n\n## Data\n\n\`\`\`json\n${JSON.stringify(record.payload, null, 2)}\n\`\`\`\n`;
    writeFileSync(join(folder, `${record.createdAt.slice(0, 10)}-${record.id}.md`), note, "utf8");
  }
}
function compact(value: string, limit: number) { return value.trim().slice(0, limit); }
const STOP_WORDS = new Set(["about", "after", "again", "also", "and", "are", "can", "for", "from", "have", "into", "only", "that", "the", "then", "this", "with", "you", "your"]);

import { createServer } from "node:http";
import { mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

const root = resolve(import.meta.dirname, "../..");
const contentDirectory = process.env.DOCS_CONTENT_DIRECTORY || join(root, "content");
const databaseFile = process.env.DOCS_DATABASE_FILE || join(root, ".local", "docs.db");
const host = process.env.DOCS_API_HOST || "127.0.0.1";
const port = Number(process.env.DOCS_API_PORT || 4185);

export function createDocsApi({ content = contentDirectory, database = databaseFile } = {}) {
  mkdirSync(dirname(database), { recursive: true });
  const index = new DocumentIndex(new DatabaseSync(database), content);
  const server = createServer((request, response) => {
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Access-Control-Allow-Origin", "http://127.0.0.1:5173");
    response.setHeader("Access-Control-Allow-Headers", "content-type, authorization");
    if (request.method === "OPTIONS") { response.writeHead(204).end(); return; }
    const url = new URL(request.url || "/", "http://localhost");
    if (url.pathname === "/health") return send(response, 200, { status: "ok", storage: "markdown+sqlite" });
    if (url.pathname === "/api/v1/docs" && request.method === "GET") return send(response, 200, { documents: index.list(url.searchParams.get("q") || "") });
    if (url.pathname === "/api/v1/docs/reindex" && request.method === "POST") return send(response, 200, { documents: index.reindex() });
    const match = /^\/api\/v1\/docs\/([a-z0-9-]+)$/.exec(url.pathname);
    if (match && request.method === "GET") {
      const document = index.get(match[1]);
      return document ? send(response, 200, { document }) : send(response, 404, { error: "Document not found" });
    }
    return send(response, 404, { error: "Not found" });
  });
  return { close: () => { index.close(); return server.listening ? new Promise(resolveClose => server.close(resolveClose)) : Promise.resolve(); }, index, server };
}

class DocumentIndex {
  constructor(database, contentDirectory) {
    this.database = database;
    this.contentDirectory = contentDirectory;
    this.database.exec(`CREATE TABLE IF NOT EXISTS docs_index (
      slug TEXT PRIMARY KEY, title TEXT NOT NULL, summary TEXT NOT NULL,
      source_path TEXT NOT NULL, updated_at TEXT NOT NULL
    )`);
    this.reindex();
  }

  list(query) {
    this.reindex();
    const search = `%${query.trim().toLowerCase()}%`;
    return this.database.prepare("SELECT slug,title,summary,updated_at AS updatedAt FROM docs_index WHERE lower(title) LIKE ? OR lower(summary) LIKE ? ORDER BY title").all(search, search);
  }

  get(slug) {
    this.reindex();
    const row = this.database.prepare("SELECT slug,title,summary,source_path AS sourcePath,updated_at AS updatedAt FROM docs_index WHERE slug=?").get(slug);
    if (!row) return undefined;
    return { ...row, body: readFileSync(row.sourcePath, "utf8") };
  }

  reindex() {
    const documents = this.readDocuments();
    const replace = this.database.prepare("INSERT INTO docs_index(slug,title,summary,source_path,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(slug) DO UPDATE SET title=excluded.title,summary=excluded.summary,source_path=excluded.source_path,updated_at=excluded.updated_at");
    const existing = new Set(this.database.prepare("SELECT slug FROM docs_index").all().map(row => row.slug));
    for (const document of documents) {
      replace.run(document.slug, document.title, document.summary, document.sourcePath, document.updatedAt);
      existing.delete(document.slug);
    }
    const remove = this.database.prepare("DELETE FROM docs_index WHERE slug=?");
    for (const slug of existing) remove.run(slug);
    return documents.length;
  }

  close() { this.database.close(); }

  readDocuments() {
    return readdirSync(this.contentDirectory, { withFileTypes: true })
      .filter(entry => entry.isFile() && [".md", ".mdx"].includes(extname(entry.name)))
      .map(entry => this.readDocument(join(this.contentDirectory, entry.name)));
  }

  readDocument(sourcePath) {
    const body = readFileSync(sourcePath, "utf8");
    const lines = body.split(/\r?\n/);
    const title = lines.find(line => line.startsWith("# "))?.slice(2).trim() || basename(sourcePath, extname(sourcePath));
    const summary = lines.find(line => line.trim() && !line.startsWith("#") && !line.startsWith("```") && !line.startsWith("- "))?.trim() || "No summary.";
    return { slug: basename(sourcePath, extname(sourcePath)).toLowerCase(), sourcePath, summary, title, updatedAt: statSync(sourcePath).mtime.toISOString() };
  }
}

function send(response, status, body) { response.writeHead(status).end(JSON.stringify(body)); }

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const app = createDocsApi();
  app.server.listen(port, host);
  for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => { void app.close(); });
}

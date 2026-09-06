import { createServer } from "node:http";
import { readFileSync, readdirSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";
import mysql from "mysql2/promise";
import { fileURLToPath } from "node:url";

const root = resolve(import.meta.dirname, "../..");
const contentDirectory = process.env.DOCS_CONTENT_DIRECTORY || join(root, "content");
const host = process.env.DOCS_API_HOST || "127.0.0.1";
const port = Number(process.env.DOCS_API_PORT || 4185);

export function createDocsApi({ authorize = authorizeWriter, content = contentDirectory, databaseUrl = process.env.DOCS_DATABASE_URL || process.env.DATABASE_URL, repository } = {}) {
  const documents = repository || (databaseUrl ? new MariaDbDocuments(databaseUrl) : new LocalDocuments());
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url || "/", "http://localhost");
      if (request.method === "OPTIONS") return send(response, 204);
      if (url.pathname === "/health") return send(response, 200, { status: "ok", storage: documents.storage });
      await documents.start(content);
      if (url.pathname === "/api/v1/docs" && request.method === "GET") return send(response, 200, { documents: await documents.list(url.searchParams.get("q") || "") });
      if (url.pathname === "/api/v1/docs" && request.method === "POST") return await writeDocument(request, response, documents, authorize);
      const match = /^\/api\/v1\/docs\/([a-z0-9-]+)$/.exec(url.pathname);
      if (match && request.method === "GET") return send(response, 200, { document: await documents.get(match[1]) });
      if (match && request.method === "PUT") return await writeDocument(request, response, documents, authorize, match[1]);
      return send(response, 404, { error: "Not found" });
    } catch (error) { return send(response, error instanceof HttpError ? error.status : 500, { error: error instanceof Error ? error.message : "Documentation service is unavailable." }); }
  });
  return { close: () => documents.close(), server };
}

class MariaDbDocuments {
  storage = "mariadb";
  #pool; #ready = false;
  constructor(databaseUrl) { if (!databaseUrl) throw new Error("DOCS_DATABASE_URL or DATABASE_URL is required for Docs."); this.#pool = mysql.createPool(databaseUrl); }
  async start(content) {
    if (this.#ready) return;
    await this.#pool.query(`CREATE TABLE IF NOT EXISTS docs_pages (slug VARCHAR(160) PRIMARY KEY, title VARCHAR(240) NOT NULL, summary VARCHAR(360) NOT NULL, page_group VARCHAR(80) NOT NULL, body MEDIUMTEXT NOT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, updated_by VARCHAR(254) NOT NULL) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    const [rows] = await this.#pool.query("SELECT COUNT(*) AS count FROM docs_pages");
    if (Number(rows[0]?.count) === 0) await this.seed(content);
    this.#ready = true;
  }
  async list(query) { const [rows] = await this.#pool.query("SELECT slug, title, summary, page_group AS `group`, updated_at AS updatedAt FROM docs_pages WHERE title LIKE ? OR summary LIKE ? ORDER BY page_group, title", [`%${query.trim()}%`, `%${query.trim()}%`]); return rows; }
  async get(slug) { const [rows] = await this.#pool.query("SELECT slug, title, summary, page_group AS `group`, body, updated_at AS updatedAt FROM docs_pages WHERE slug = ?", [slug]); if (!rows[0]) throw new HttpError(404, "Document not found."); return rows[0]; }
  async upsert(page, actor) { const now = new Date(); await this.#pool.query("INSERT INTO docs_pages (slug, title, summary, page_group, body, created_at, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE title = VALUES(title), summary = VALUES(summary), page_group = VALUES(page_group), body = VALUES(body), updated_at = VALUES(updated_at), updated_by = VALUES(updated_by)", [page.slug, page.title, page.summary, page.group, page.body, now, now, actor]); return this.get(page.slug); }
  async seed(content) { for (const page of readSeedPages(content)) await this.upsert(page, "system-seed"); }
  close() { return this.#pool.end(); }
}

class LocalDocuments {
  storage = "local";
  #pages = new Map();

  async start(content) {
    if (this.#pages.size > 0) return;
    for (const page of readSeedPages(content)) this.#pages.set(page.slug, { ...page, updatedAt: "local" });
  }

  async list(query) {
    const term = query.trim().toLowerCase();
    return [...this.#pages.values()]
      .filter((page) => !term || `${page.title} ${page.summary}`.toLowerCase().includes(term))
      .sort((left, right) => left.group.localeCompare(right.group) || left.title.localeCompare(right.title));
  }

  async get(slug) {
    const page = this.#pages.get(slug);
    if (!page) throw new HttpError(404, "Document not found.");
    return page;
  }

  async upsert() { throw new HttpError(503, "Configure DOCS_DATABASE_URL or DATABASE_URL to edit documentation."); }
  async close() {}
}

async function writeDocument(request, response, documents, authorize, slug) { const actor = await authorize(request.headers.authorization); const page = validatePage(await readJson(request), slug); return send(response, slug ? 200 : 201, { document: await documents.upsert(page, actor) }); }
async function authorizeWriter(authorization) {
  const identityUrl = process.env.OS_IDENTITY_URL;
  if (!identityUrl || !authorization) throw new HttpError(401, "Authentication is required.");
  const response = await fetch(new URL("/api/v1/identity/me", identityUrl), { headers: { authorization }, signal: AbortSignal.timeout(5_000) });
  if (!response.ok) throw new HttpError(401, "Authentication is required.");
  const { profile } = await response.json();
  if (!profile?.permissions?.includes("identity.admin")) throw new HttpError(403, "Documentation administration is required.");
  return profile.login;
}
async function readJson(request) { const body = await new Promise((resolveBody, reject) => { let value = ""; request.on("data", chunk => { value += chunk; if (value.length > 1_000_000) reject(new HttpError(413, "Document is too large.")); }); request.on("end", () => resolveBody(value)); request.on("error", reject); }); try { return JSON.parse(body); } catch { throw new HttpError(400, "Enter a valid document."); } }
function validatePage(input, expectedSlug) {
  if (!input || typeof input !== "object") throw new HttpError(400, "Enter a valid document.");
  const page = { slug: String(input.slug || "").trim().toLowerCase(), title: String(input.title || "").trim(), summary: String(input.summary || "").trim(), group: String(input.group || "").trim(), body: String(input.body || "") };
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(page.slug) || page.slug.length > 160) throw new HttpError(400, "Use a lowercase document slug with hyphens.");
  if (expectedSlug && page.slug !== expectedSlug) throw new HttpError(400, "The document slug cannot change.");
  if (!page.title || page.title.length > 240 || !page.summary || page.summary.length > 360 || !page.group || page.group.length > 80 || !page.body.trim()) throw new HttpError(400, "Enter a title, one-line description, group, and document body.");
  return page;
}
function readSeedPages(content) { return readdirSync(content, { withFileTypes: true }).filter(entry => entry.isFile() && [".md", ".mdx"].includes(extname(entry.name))).map(entry => { const sourcePath = join(content, entry.name); const body = readFileSync(sourcePath, "utf8"); const title = body.match(/^# (.+)$/m)?.[1]?.trim() || basename(sourcePath, extname(sourcePath)); const summary = body.split(/\r?\n/).find(line => line.trim() && !line.startsWith("#") && !line.startsWith("```") && !line.startsWith("- "))?.trim() || "Documentation page."; return { body, group: seedGroup(basename(sourcePath, extname(sourcePath))), slug: basename(sourcePath, extname(sourcePath)).toLowerCase(), summary, title }; }); }
function seedGroup(slug) { return ["architecture", "framework", "identity"].includes(slug) ? "Platform foundation" : ["chat-messenger", "dcs-device-chat"].includes(slug) ? "Workspaces and connectivity" : slug.startsWith("zetro") ? "Agents and tasks" : "Applications and operations"; }
function send(response, status, body) { response.setHeader("Content-Type", "application/json; charset=utf-8"); response.setHeader("Cache-Control", "no-store"); response.setHeader("Access-Control-Allow-Origin", "http://127.0.0.1:5173"); response.setHeader("Access-Control-Allow-Headers", "content-type, authorization"); response.writeHead(status).end(body ? JSON.stringify(body) : undefined); }
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) { const app = createDocsApi(); app.server.listen(port, host); for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => { void app.close(); }); }

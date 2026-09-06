import assert from "node:assert/strict";
import test from "node:test";
import { createDocsApi } from "./server.mjs";

test("lists database pages, reports readiness, and upserts an administrator edit", async () => {
  const pages = new Map([["architecture", { body: "# Architecture", group: "Platform", slug: "architecture", summary: "Platform guide.", title: "Architecture", updatedAt: "2026-01-01" }]]);
  const repository = { close: async () => undefined, get: async (slug) => { const page = pages.get(slug); if (!page) throw new Error("Document not found."); return page; }, list: async () => [...pages.values()], start: async () => undefined, status: async () => ({ documents: pages.size, migration: "docs.pages.v1", status: "ok", storage: "mariadb", table: "docs_pages" }), upsert: async (page) => { const saved = { ...page, updatedAt: "2026-01-02" }; pages.set(page.slug, saved); return saved; } };
  const app = createDocsApi({ authorize: async () => "admin@example.com", repository });
  await new Promise((resolve) => app.server.listen(0, "127.0.0.1", resolve));
  const port = app.server.address().port;
  try {
    assert.equal((await (await fetch(`http://127.0.0.1:${port}/api/v1/docs`)).json()).documents.length, 1);
    assert.deepEqual(await (await fetch(`http://127.0.0.1:${port}/api/v1/docs/status`)).json(), { documents: 1, migration: "docs.pages.v1", status: "ok", storage: "mariadb", table: "docs_pages" });
    const response = await fetch(`http://127.0.0.1:${port}/api/v1/docs`, { body: JSON.stringify({ body: "# New page", group: "Platform", slug: "new-page", summary: "A new page.", title: "New page" }), headers: { "content-type": "application/json" }, method: "POST" });
    assert.equal(response.status, 201);
    assert.equal((await (await fetch(`http://127.0.0.1:${port}/api/v1/docs/new-page`)).json()).document.title, "New page");
  } finally { await app.close(); await new Promise((resolve) => app.server.close(resolve)); }
});

test("requires a database when no repository is supplied", () => {
  assert.throws(() => createDocsApi({ databaseUrl: "" }), /DOCS_DATABASE_URL or DATABASE_URL is required/u);
});

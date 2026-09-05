import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createDocsApi } from "./server.mjs";

test("indexes local Markdown and persists metadata in SQLite", async () => {
  const directory = mkdtempSync(join(tmpdir(), "codexsun-docs-"));
  writeFileSync(join(directory, "identity.mdx"), "# Identity\n\nShared authentication docs.\n");
  const app = createDocsApi({ content: directory, database: join(directory, "docs.db") });
  try {
    assert.deepEqual(app.index.list("identity").map(document => document.slug), ["identity"]);
    assert.match(app.index.get("identity").body, /Shared authentication/u);
  } finally { await app.close(); }
});

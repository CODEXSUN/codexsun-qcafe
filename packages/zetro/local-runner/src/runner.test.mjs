import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, mkdir, symlink, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { WorkspaceTools } from "./workspace-tools.mjs";
import { createRunnerHttp } from "./http.mjs";

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "zetro-tools-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, "brief.md"), "Project: Lantern\nMilestone: Friday\n");
  return { root, workspace: await WorkspaceTools.create(root) };
}

test("read, list, and search return real local evidence", async (t) => {
  const { workspace } = await fixture(t);
  assert.equal((await workspace.list()).entries[0].name, "brief.md");
  assert.match((await workspace.read({ path: "brief.md" })).text, /Lantern/);
  assert.deepEqual((await workspace.search({ query: "milestone" })).matches, [{ path: "brief.md", line: 2, text: "Milestone: Friday" }]);
});

test("deny traversal, hidden files, credentials, links, binary and oversized files", async (t) => {
  const { root, workspace } = await fixture(t);
  await writeFile(join(root, ".env"), "SECRET");
  await writeFile(join(root, "auth.json"), "SECRET");
  await writeFile(join(root, "big.txt"), "x".repeat(65537));
  await writeFile(join(root, "binary.txt"), Buffer.from([0, 1, 2]));
  await mkdir(join(root, "folder"));
  await symlink(join(root, "folder"), join(root, "linked"), process.platform === "win32" ? "junction" : "dir");
  for (const path of ["../brief.md", "/brief.md", "C:/brief.md", "brief.md:stream", ".env", "auth.json", "big.txt", "binary.txt", "linked/file.md", "folder/../brief.md"]) {
    await assert.rejects(() => workspace.read({ path }), undefined, path);
  }
  assert.ok(!(await workspace.list()).entries.some((entry) => entry.name === "auth.json" || entry.name === "linked"));
});

test("HTTP MCP authenticates, rejects browser origins, and calls only registered tools", async (t) => {
  const { workspace } = await fixture(t);
  const token = "t".repeat(64);
  const audit = [];
  const server = createRunnerHttp({ workspace, token, audit: (event) => audit.push(event) });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((done) => { server.closeAllConnections(); server.close(done); }));
  const url = new URL(`http://127.0.0.1:${server.address().port}/mcp`);
  assert.equal((await fetch(url, { method: "POST" })).status, 401);
  assert.equal((await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}`, Origin: "http://untrusted.example" } })).status, 403);
  const client = new Client({ name: "test", version: "1" });
  await client.connect(new StreamableHTTPClientTransport(url, { requestInit: { headers: { Authorization: `Bearer ${token}` } } }));
  t.after(() => client.close());
  assert.deepEqual((await client.listTools()).tools.map((tool) => tool.name).sort(), ["workspace_list", "workspace_read", "workspace_search"]);
  const result = await client.callTool({ name: "workspace_read", arguments: { path: "brief.md" } });
  assert.match(result.content[0].text, /Lantern/);
  const denied = await client.callTool({ name: "workspace_read", arguments: { path: "../outside.md" } });
  assert.equal(denied.isError, true);
  const unknown = await client.callTool({ name: "shell", arguments: { command: "whoami" } });
  assert.equal(unknown.isError, true);
  assert.deepEqual(audit.map((event) => event.status), ["completed", "failed"]);
  assert.ok(audit.every((event) => !JSON.stringify(event).includes("Lantern")));
});

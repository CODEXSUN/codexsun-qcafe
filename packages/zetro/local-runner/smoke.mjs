import assert from "node:assert/strict";

const response = await fetch("http://127.0.0.1:4150/api/v1/zetro/messages", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ agentId: "zetro", message: "Use all three local_workspace tools: workspace_list to list the sample root, workspace_read to read project-brief.md, and workspace_search to find milestone. Report the project name, owner, and next milestone from the file, with file and line references. Do not change files." }),
  signal: AbortSignal.timeout(130000),
});
const result = await response.json();
assert.equal(response.status, 200, JSON.stringify(result));
assert.equal(result.provider, "codex");
assert.match(result.message, /Lantern Notes/i);
assert.match(result.message, /Friday/i);
for (const name of ["workspace_list", "workspace_read", "workspace_search"]) {
  assert.ok(result.activities.some((activity) => activity.label === `local_workspace / ${name}` && activity.status === "completed"), `Missing real tool evidence: ${name}`);
}
console.log(JSON.stringify({ status: "passed", provider: result.provider, message: result.message, activities: result.activities, usage: result.usage }, null, 2));

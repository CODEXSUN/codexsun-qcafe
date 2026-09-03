import { test } from "node:test";
import assert from "node:assert/strict";
import { readPageUrl, writePageUrl } from "../packages/ui/desk/src/blocks/workspace/page-url.ts";

const fallback = { view: "workspace", addonId: "overview", pageId: "home" };
test("restores registered applications and falls back for unknown applications", () => {
  assert.deepEqual(readPageUrl(new URL("http://localhost/?app=zetro&page=agent"), fallback, ["zetro"]), { view: "workspace", addonId: "zetro", pageId: "agent" });
  assert.deepEqual(readPageUrl(new URL("http://localhost/?app=unknown"), fallback, ["zetro"]), fallback);
});
test("navigation preserves unrelated query parameters and clears stale page values", () => {
  const next = writePageUrl(new URL("http://localhost/?app=zetro&page=agent&filter=active"), { view: "workspace", addonId: "chat" });
  assert.equal(next.searchParams.get("app"), "chat");
  assert.equal(next.searchParams.has("page"), false);
  assert.equal(next.searchParams.get("filter"), "active");
});

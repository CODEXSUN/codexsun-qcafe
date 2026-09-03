import assert from "node:assert/strict";
import test from "node:test";
import { loadAssistManifest, validateAssistManifest } from "./assist-doctor.mjs";

const root = new URL("..", import.meta.url).pathname.replace(/^\/(.:)/u, "$1");

test("validates the repository module ownership manifest", () => {
  const manifest = loadAssistManifest(root);
  assert.deepEqual(validateAssistManifest(manifest, root), []);
});

test("rejects duplicate module ownership IDs", () => {
  const manifest = {
    modules: [
      { id: "platform.core", owner: "Platform", protectedPaths: ["apps"], publicContracts: [], roots: ["apps"] },
      { id: "platform.core", owner: "Platform", protectedPaths: ["packages"], publicContracts: [], roots: ["packages"] },
    ],
    schemaVersion: 1,
  };
  assert.match(validateAssistManifest(manifest, root).join("\n"), /Duplicate module ownership ID/u);
});

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { KnowledgeLoop } from "./index.js";

describe("KnowledgeLoop", () => {
  it("records queued prompt evidence in order and retrieves scoped records", () => {
    const folder = mkdtempSync(join(tmpdir(), "zetro-knowledge-"));
    try {
      const knowledge = new KnowledgeLoop(join(folder, "knowledge.db"));
      knowledge.enqueue("prompt", { summary: "Review the ZXA connection flow." });
      knowledge.enqueue("evidence", { summary: "Connection endpoint returned healthy." });
      expect(knowledge.drain()).toBe(2);
      expect(knowledge.search("project", "connection").map(record => record.kind)).toEqual(["evidence", "prompt"]);
      knowledge.close();
    } finally { rmSync(folder, { recursive: true, force: true }); }
  });
});

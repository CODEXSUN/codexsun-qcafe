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

  it("recalls relevant evidence and only accepted learning proposals", () => {
    const folder = mkdtempSync(join(tmpdir(), "zetro-memory-"));
    try {
      const knowledge = new KnowledgeLoop(join(folder, "knowledge.db"));
      knowledge.record("evidence", "project", "Orship release endpoint passed its contract test.");
      const proposal = knowledge.record("learning-proposal", "project", "Use the Orship release contract for deployments.");
      expect(knowledge.recall("project", "prepare orship deployment").map((record) => record.kind)).toEqual(["evidence"]);
      knowledge.reviewProposal(proposal.id, "accepted", "Repeated and verified.");
      expect(knowledge.recall("project", "prepare orship deployment").map((record) => record.kind)).toEqual(["learning-proposal", "evidence"]);
      knowledge.close();
    } finally { rmSync(folder, { recursive: true, force: true }); }
  });
});

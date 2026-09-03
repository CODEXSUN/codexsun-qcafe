import { expect, it } from "vitest";
import { exportConversation, readHistory, saveHistory, type SavedConversation } from "./history.js";
const item: SavedConversation = { id: "session", agentId: "article-agent", conversationId: "thread", title: "Draft", messages: [{ id: "message", role: "You", content: "Draft an article" }], updatedAt: "2026-09-03", archived: false };
it("resumes the original specialist and conversation identity", () => {
  let saved = "";
  saveHistory({ setItem: (_key, value) => { saved = value; } }, [item]);
  expect(readHistory({ getItem: () => saved })[0]).toMatchObject(item);
});
it("rejects corrupt stored records", () => {
  expect(readHistory({ getItem: () => "not json" })).toEqual([]);
  expect(readHistory({ getItem: () => '[{"id":"a","messages":[null]}]' })).toEqual([]);
});
it("exports only conversation data", () => {
  const result = JSON.parse(exportConversation(item));
  expect(result.agentId).toBe("article-agent");
  expect(Object.keys(result).sort()).toEqual(["agentId", "conversationId", "messages", "title", "updatedAt"].sort());
});

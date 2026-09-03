import { expect, it } from "vitest";
import { conversationGroup, loadConversations, saveConversations } from "./conversations.js";

it("groups conversations by local calendar date", () => {
  const now = new Date(2026, 8, 3, 12);
  expect(conversationGroup(new Date(2026, 8, 3, 1).toISOString(), now)).toBe("Today");
  expect(conversationGroup(new Date(2026, 8, 2, 23).toISOString(), now)).toBe("Yesterday");
  expect(conversationGroup(new Date(2026, 7, 30).toISOString(), now)).toBe("Previous 7 days");
  expect(conversationGroup(new Date(2026, 7, 20).toISOString(), now)).toBe("Older");
});

it("restores stored prompt-response pairs", () => {
  let data: string | null = null;
  const storage = { getItem: () => data, setItem: (_key: string, value: string) => { data = value; } };
  const items = [{ id: "chat", title: "A prompt", updatedAt: new Date().toISOString(), exchanges: [{ id: "turn", prompt: "A prompt", result: "A response" }] }];
  saveConversations(storage, items);
  expect(loadConversations(storage)).toEqual(items);
});

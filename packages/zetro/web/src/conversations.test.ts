import { expect, it } from "vitest";
import { conversationGroup, formatChatDateDivider, formatShortTime, groupExchangesByDate, loadConversations, loadProjects, saveConversations, saveProjects } from "./conversations.js";

it("groups conversations by local calendar date", () => {
  const now = new Date(2026, 8, 3, 12);
  expect(conversationGroup(new Date(2026, 8, 3, 1).toISOString(), now)).toBe("Today");
  expect(conversationGroup(new Date(2026, 8, 2, 23).toISOString(), now)).toBe("Yesterday");
  expect(conversationGroup(new Date(2026, 7, 30).toISOString(), now)).toBe("Previous 7 days");
  expect(conversationGroup(new Date(2026, 7, 20).toISOString(), now)).toBe("Older");
});

it("formats short time with AM and PM", () => {
  const morning = new Date(2026, 8, 3, 9, 30);
  const afternoon = new Date(2026, 8, 3, 13, 5);
  expect(formatShortTime(morning.toISOString())).toMatch(/9:30\s?AM/i);
  expect(formatShortTime(afternoon.toISOString())).toMatch(/1:05\s?PM/i);
});

it("formats chat date dividers for today, yesterday, and earlier dates", () => {
  const now = new Date(2026, 8, 3, 12);
  expect(formatChatDateDivider(new Date(2026, 8, 3, 8).toISOString(), now)).toBe("Today");
  expect(formatChatDateDivider(new Date(2026, 8, 2, 14).toISOString(), now)).toBe("Yesterday");
  expect(formatChatDateDivider(new Date(2025, 4, 11, 10).toISOString(), now)).toMatch(/May 11,\s?2025/i);
});

it("groups consecutive chat exchanges by date", () => {
  const now = new Date(2026, 8, 3, 12);
  const exchanges = [
    { id: "e1", prompt: "Hi 1", result: "R1", timestamp: new Date(2026, 8, 2, 10).toISOString() },
    { id: "e2", prompt: "Hi 2", result: "R2", timestamp: new Date(2026, 8, 2, 12).toISOString() },
    { id: "e3", prompt: "Hi 3", result: "R3", timestamp: new Date(2026, 8, 3, 9).toISOString() },
  ];
  const groups = groupExchangesByDate(exchanges, now);
  expect(groups).toHaveLength(2);
  expect(groups[0]?.dateLabel).toBe("Yesterday");
  expect(groups[0]?.items).toHaveLength(2);
  expect(groups[1]?.dateLabel).toBe("Today");
  expect(groups[1]?.items).toHaveLength(1);
});

it("restores stored prompt-response pairs with timestamps and feedback", () => {
  let data: string | null = null;
  const storage = { getItem: () => data, setItem: (_key: string, value: string) => { data = value; } };
  const items = [{
    id: "chat",
    title: "A prompt",
    updatedAt: new Date().toISOString(),
    exchanges: [{ id: "turn", prompt: "A prompt", result: "A response", timestamp: new Date().toISOString(), feedback: "up" as const }],
  }];
  saveConversations(storage, items);
  expect(loadConversations(storage)).toEqual(items);
});

it("loads default projects when storage is empty and saves custom projects", () => {
  let data: string | null = null;
  const storage = { getItem: () => data, setItem: (_key: string, value: string) => { data = value; } };
  const loadedDefaults = loadProjects(storage);
  expect(loadedDefaults.length).toBeGreaterThan(0);
  expect(loadedDefaults[0]?.name).toBe("DevKit");

  const customProjects = [{ id: "p-test", name: "Custom Project", description: "Testing" }];
  saveProjects(storage, customProjects);
  expect(loadProjects(storage)).toEqual(customProjects);
});

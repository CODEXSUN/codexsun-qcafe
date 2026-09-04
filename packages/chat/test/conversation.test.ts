import { describe, expect, it } from "vitest";
import { ChatAccessError, Conversation } from "@codexsun/chat-api";

describe("Chat conversation domain", () => {
  it("creates a direct conversation with stable membership", () => {
    const conversation = Conversation.create("actor-b", "actor-a", new Date("2026-09-04T10:00:00Z"));
    expect(conversation.memberIds).toEqual(["actor-a", "actor-b"]);
    expect(conversation.snapshot().createdAt).toBe("2026-09-04T10:00:00.000Z");
  });

  it("rejects self conversations and non-member access", () => {
    expect(() => Conversation.create("actor-a", "actor-a")).toThrow(ChatAccessError);
    const conversation = Conversation.create("actor-a", "actor-b");
    expect(() => conversation.requireMember("actor-c")).toThrow(ChatAccessError);
  });

  it("keeps archive and mute preferences actor-specific", () => {
    const conversation = Conversation.create("actor-a", "actor-b");
    conversation.setPreferences("actor-a", { archived: true }, new Date("2026-09-04T11:00:00Z"));
    expect(conversation.viewFor("actor-a").preference.archivedAt).toBe("2026-09-04T11:00:00.000Z");
    expect(conversation.viewFor("actor-b").preference.archivedAt).toBeNull();
  });
});

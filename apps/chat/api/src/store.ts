import { randomUUID } from "node:crypto";

export type ChatMessage = { body: string; conversationId: string; createdAt: string; id: string; senderId: string; status: "sent" | "delivered" | "read" };
export type ChatConversation = { id: string; memberIds: string[]; updatedAt: string };

export class ChatStore {
  private readonly conversations = new Map<string, ChatConversation>();
  private readonly messages = new Map<string, ChatMessage[]>();

  createConversation(actorId: string, memberIds: string[]) {
    const members = [...new Set([actorId, ...memberIds])].sort();
    const existing = [...this.conversations.values()].find((conversation) => conversation.memberIds.length === members.length && conversation.memberIds.every((id, index) => id === members[index]));
    if (existing) return existing;
    const conversation = { id: randomUUID(), memberIds: members, updatedAt: new Date().toISOString() };
    this.conversations.set(conversation.id, conversation);
    this.messages.set(conversation.id, []);
    return conversation;
  }

  list(actorId: string) { return [...this.conversations.values()].filter((conversation) => conversation.memberIds.includes(actorId)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)); }
  history(actorId: string, conversationId: string) { this.requireMember(actorId, conversationId); return this.messages.get(conversationId) ?? []; }
  send(actorId: string, conversationId: string, body: string) {
    this.requireMember(actorId, conversationId);
    const message = { body, conversationId, createdAt: new Date().toISOString(), id: randomUUID(), senderId: actorId, status: "delivered" as const };
    this.messages.get(conversationId)?.push(message);
    const conversation = this.conversations.get(conversationId)!;
    conversation.updatedAt = message.createdAt;
    return message;
  }

  private requireMember(actorId: string, conversationId: string) {
    const conversation = this.conversations.get(conversationId);
    if (!conversation || !conversation.memberIds.includes(actorId)) throw new Error("Conversation is unavailable.");
  }
}

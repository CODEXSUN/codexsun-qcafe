import type { ChatMessage } from "@codexsun/chat-contracts";
import type { ChatRepository } from "../application/ports.js";
import type { ConversationState } from "../domain/conversation.js";

export class InMemoryChatRepository implements ChatRepository {
  private readonly conversations = new Map<string, ConversationState>();
  private readonly messages = new Map<string, ChatMessage[]>();

  async findConversation(id: string) { return clone(this.conversations.get(id)); }
  async findDirectConversation(actorIds: [string, string]) {
    return clone([...this.conversations.values()].find((item) => item.memberIds.length === 2 && item.memberIds.every((id, index) => id === actorIds[index])));
  }
  async listConversations(actorId: string) {
    return [...this.conversations.values()].filter((item) => item.memberIds.includes(actorId)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map((item) => structuredClone(item));
  }
  async listMessages(conversationId: string) { return structuredClone(this.messages.get(conversationId) ?? []); }
  async saveConversation(conversation: ConversationState) { this.conversations.set(conversation.id, structuredClone(conversation)); }
  async saveMessage(conversationId: string, message: ChatMessage) {
    const messages = this.messages.get(conversationId) ?? [];
    messages.push(structuredClone(message));
    this.messages.set(conversationId, messages);
  }
}

function clone<T>(value: T | undefined): T | undefined {
  return value === undefined ? undefined : structuredClone(value);
}

import type { ChatActor, ChatEvent, ChatMessage } from "@codexsun/chat-contracts";
import type { ConversationState } from "../domain/conversation.js";

export interface ChatRepository {
  saveTurn?(conversation: ConversationState, message: ChatMessage, event: ChatEvent): Promise<void>;
  findConversation(id: string): Promise<ConversationState | undefined>;
  findDirectConversation(actorIds: [string, string]): Promise<ConversationState | undefined>;
  listConversations(actorId: string): Promise<ConversationState[]>;
  listMessages(conversationId: string): Promise<ChatMessage[]>;
  saveConversation(conversation: ConversationState): Promise<void>;
  saveMessage(conversationId: string, message: ChatMessage): Promise<void>;
}

export interface ChatIdentityProvider {
  authenticate(token: string): Promise<ChatActor | undefined>;
  findActor(actorId: string): Promise<ChatActor | undefined>;
  listContacts(actorId: string): Promise<ChatActor[]>;
}

export interface ChatEventPublisher {
  publish(event: ChatEvent): Promise<void>;
}

export interface ChatClock {
  now(): Date;
}

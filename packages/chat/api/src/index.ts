export { createChatModule, type ChatModuleOptions } from "./chat-module.js";
export { ChatService } from "./application/chat-service.js";
export type { ChatClock, ChatEventPublisher, ChatIdentityProvider, ChatRepository } from "./application/ports.js";
export { Conversation, type ConversationState } from "./domain/conversation.js";
export { ChatAccessError, ChatNotFoundError } from "./domain/chat-errors.js";
export { InMemoryChatRepository } from "./infrastructure/in-memory-chat-repository.js";
export { LocalChatEventBus } from "./infrastructure/local-event-bus.js";
export { StaticIdentityProvider } from "./infrastructure/static-identity-provider.js";
export { buildChatApp } from "./interfaces/http/chat-app.js";

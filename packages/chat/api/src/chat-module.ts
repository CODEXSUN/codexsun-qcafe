import type { ChatIdentityProvider, ChatRepository, ChatEventPublisher } from "./application/ports.js";
import { ChatService } from "./application/chat-service.js";
import { InMemoryChatRepository } from "./infrastructure/in-memory-chat-repository.js";
import { LocalChatEventBus } from "./infrastructure/local-event-bus.js";
import { buildChatApp } from "./interfaces/http/chat-app.js";

export type ChatModuleOptions = {
  identities: ChatIdentityProvider;
  repository?: ChatRepository;
  events?: ChatEventPublisher;
  allowedOrigins?: string[];
};

export function createChatModule(options: ChatModuleOptions) {
  const repository = options.repository ?? new InMemoryChatRepository();
  const events = options.events ?? new LocalChatEventBus();
  const service = new ChatService(repository, options.identities, events);
  return { app: buildChatApp(service, options.identities, options.allowedOrigins), events, repository, service };
}

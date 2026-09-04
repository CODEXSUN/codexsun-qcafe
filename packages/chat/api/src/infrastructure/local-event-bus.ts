import type { ChatEvent } from "@codexsun/chat-contracts";
import type { ChatEventPublisher } from "../application/ports.js";

export class LocalChatEventBus implements ChatEventPublisher {
  private readonly listeners = new Set<(event: ChatEvent) => void>();

  async publish(event: ChatEvent) {
    for (const listener of this.listeners) listener(event);
  }

  subscribe(listener: (event: ChatEvent) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

import { Redis } from "ioredis";
import type { ChatEvent } from "@codexsun/chat-contracts";
import { LocalChatEventBus } from "./local-event-bus.js";

/** Redis carries invalidations; committed message history remains the source of truth. */
export class RedisChatEventBus extends LocalChatEventBus {
  private readonly publisher: Redis;
  private readonly subscriber: Redis;
  private readonly channel = "codexsun:chat:events";
  constructor(url: string) {
    super();
    this.publisher = new Redis(url, { maxRetriesPerRequest: 1, enableOfflineQueue: false });
    this.subscriber = new Redis(url, { maxRetriesPerRequest: 1 });
    this.publisher.on("error", () => {});
    this.subscriber.on("error", () => {});
    this.subscriber.on("message", (_channel, payload) => {
      try { void super.publish(JSON.parse(payload) as ChatEvent); } catch { /* Invalid notifications do not change stored history. */ }
    });
  }
  async start() { await this.subscriber.subscribe(this.channel); }
  override async publish(event: ChatEvent) {
    try { await this.publisher.publish(this.channel, JSON.stringify(event)); }
    catch { await super.publish(event); }
  }
  async close() { this.publisher.disconnect(); this.subscriber.disconnect(); }
}

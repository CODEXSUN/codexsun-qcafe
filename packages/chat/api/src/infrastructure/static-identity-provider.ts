import type { ChatActor } from "@codexsun/chat-contracts";
import type { ChatIdentityProvider } from "../application/ports.js";
import { randomBytes } from "node:crypto";

type TokenRecord = { actorId: string; expiresAt?: number };

export class StaticIdentityProvider implements ChatIdentityProvider {
  private readonly actors = new Map<string, ChatActor>();
  private readonly tokens = new Map<string, TokenRecord>();

  constructor(entries: Array<{ actor: ChatActor; token: string }>) {
    for (const entry of entries) {
      this.actors.set(entry.actor.uuid, entry.actor);
      this.tokens.set(entry.token, { actorId: entry.actor.uuid });
    }
  }

  async authenticate(token: string) {
    const record = this.tokens.get(token);
    if (!record) return undefined;
    if (record.expiresAt !== undefined && record.expiresAt <= Date.now()) {
      this.tokens.delete(token);
      return undefined;
    }
    return this.findActor(record.actorId);
  }

  issue(actorId: string, lifetimeMs: number) {
    if (!this.actors.has(actorId)) throw new Error(`Unknown Chat actor: ${actorId}`);
    const accessToken = randomBytes(32).toString("base64url");
    const expiresAt = Date.now() + lifetimeMs;
    this.tokens.set(accessToken, { actorId, expiresAt });
    return { accessToken, expiresAt: new Date(expiresAt).toISOString() };
  }
  async findActor(actorId: string) { return this.actors.get(actorId); }
  async listContacts(actorId: string) { return [...this.actors.values()].filter((actor) => actor.uuid !== actorId); }
}

import type { ChatActor } from "@codexsun/chat-contracts";
import type { ChatIdentityProvider } from "../application/ports.js";

export class StaticIdentityProvider implements ChatIdentityProvider {
  private readonly actors = new Map<string, ChatActor>();
  private readonly tokens = new Map<string, string>();

  constructor(entries: Array<{ actor: ChatActor; token: string }>) {
    for (const entry of entries) {
      this.actors.set(entry.actor.uuid, entry.actor);
      this.tokens.set(entry.token, entry.actor.uuid);
    }
  }

  async authenticate(token: string) { return this.findActor(this.tokens.get(token) ?? ""); }
  async findActor(actorId: string) { return this.actors.get(actorId); }
  async listContacts(actorId: string) { return [...this.actors.values()].filter((actor) => actor.uuid !== actorId); }
}

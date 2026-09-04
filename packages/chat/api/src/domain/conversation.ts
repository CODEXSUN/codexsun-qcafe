import { randomUUID } from "node:crypto";
import type { ChatMessage } from "@codexsun/chat-contracts";
import { ChatAccessError } from "./chat-errors.js";

export type ConversationState = {
  id: string;
  memberIds: string[];
  createdAt: string;
  updatedAt: string;
  preferences: Record<string, { archivedAt: string | null; mutedAt: string | null }>;
  readAt: Record<string, string>;
};

export class Conversation {
  private constructor(private readonly state: ConversationState) {}

  static create(actorId: string, peerActorId: string, now = new Date()) {
    if (actorId === peerActorId) throw new ChatAccessError("A direct conversation requires another actor.");
    const timestamp = now.toISOString();
    return new Conversation({
      id: randomUUID(),
      memberIds: [actorId, peerActorId].sort(),
      createdAt: timestamp,
      updatedAt: timestamp,
      preferences: {},
      readAt: {},
    });
  }

  static restore(state: ConversationState) {
    return new Conversation(structuredClone(state));
  }

  get id() { return this.state.id; }
  get memberIds() { return [...this.state.memberIds]; }
  get updatedAt() { return this.state.updatedAt; }

  requireMember(actorId: string) {
    if (!this.state.memberIds.includes(actorId)) throw new ChatAccessError("Conversation access is denied.");
  }

  send(actorId: string, body: string, now = new Date()): ChatMessage {
    this.requireMember(actorId);
    const trimmed = body.trim();
    if (!trimmed) throw new ChatAccessError("Message body is required.");
    const timestamp = now.toISOString();
    this.state.updatedAt = timestamp;
    return { uuid: randomUUID(), actorId, body: trimmed, createdAt: timestamp, deliveredAt: timestamp, readAt: null };
  }

  markRead(actorId: string, now = new Date()) {
    this.requireMember(actorId);
    this.state.readAt[actorId] = now.toISOString();
  }

  setPreferences(actorId: string, input: { archived?: boolean; muted?: boolean }, now = new Date()) {
    this.requireMember(actorId);
    const current = this.state.preferences[actorId] ?? { archivedAt: null, mutedAt: null };
    const timestamp = now.toISOString();
    this.state.preferences[actorId] = {
      archivedAt: input.archived === undefined ? current.archivedAt : input.archived ? timestamp : null,
      mutedAt: input.muted === undefined ? current.mutedAt : input.muted ? timestamp : null,
    };
  }

  viewFor(actorId: string) {
    this.requireMember(actorId);
    return {
      peerActorId: this.state.memberIds.find((id) => id !== actorId)!,
      preference: this.state.preferences[actorId] ?? { archivedAt: null, mutedAt: null },
      readAt: this.state.readAt[actorId] ?? null,
    };
  }

  snapshot() { return structuredClone(this.state); }
}

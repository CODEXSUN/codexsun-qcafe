import type { ChatActor, ChatConversation, ChatHistory } from "@codexsun/chat-contracts";
import { Conversation } from "../domain/conversation.js";
import { ChatAccessError, ChatNotFoundError } from "../domain/chat-errors.js";
import type { ChatClock, ChatEventPublisher, ChatIdentityProvider, ChatRepository } from "./ports.js";

export class ChatService {
  constructor(
    private readonly repository: ChatRepository,
    private readonly identities: ChatIdentityProvider,
    private readonly events: ChatEventPublisher,
    private readonly clock: ChatClock = { now: () => new Date() },
  ) {}

  async profile(actorId: string) { return this.requireActor(actorId); }
  async contacts(actorId: string) { await this.requireActor(actorId); return this.identities.listContacts(actorId); }

  async list(actorId: string): Promise<ChatConversation[]> {
    await this.requireActor(actorId);
    return Promise.all((await this.repository.listConversations(actorId)).map((state) => this.toView(Conversation.restore(state), actorId)));
  }

  async open(actorId: string, peerActorId: string): Promise<ChatConversation> {
    await Promise.all([this.requireActor(actorId), this.requireActor(peerActorId)]);
    const members = [actorId, peerActorId].sort() as [string, string];
    const existing = await this.repository.findDirectConversation(members);
    const conversation = existing ? Conversation.restore(existing) : Conversation.create(actorId, peerActorId, this.clock.now());
    if (!existing) await this.repository.saveConversation(conversation.snapshot());
    return this.toView(conversation, actorId);
  }

  async history(actorId: string, conversationId: string, limit: number, before?: string): Promise<ChatHistory> {
    const conversation = await this.requireConversation(actorId, conversationId);
    conversation.requireMember(actorId);
    const messages = (await this.repository.listMessages(conversationId)).filter((message) => !before || message.createdAt < before);
    const page = messages.slice(-limit);
    return { items: page, nextCursor: messages.length > page.length ? page[0]?.createdAt ?? null : null };
  }

  async send(actorId: string, conversationId: string, body: string) {
    const conversation = await this.requireConversation(actorId, conversationId);
    const message = conversation.send(actorId, body, this.clock.now());
    await this.repository.saveMessage(conversationId, message);
    await this.repository.saveConversation(conversation.snapshot());
    await this.events.publish({ type: "message.created", actorIds: conversation.memberIds, conversationId, message });
    return message;
  }

  async markRead(actorId: string, conversationId: string) {
    const conversation = await this.requireConversation(actorId, conversationId);
    conversation.markRead(actorId, this.clock.now());
    await this.repository.saveConversation(conversation.snapshot());
    await this.events.publish({ type: "conversation.updated", actorIds: conversation.memberIds, conversationId });
  }

  async setPreferences(actorId: string, conversationId: string, input: { archived?: boolean; muted?: boolean }) {
    const conversation = await this.requireConversation(actorId, conversationId);
    conversation.setPreferences(actorId, input, this.clock.now());
    await this.repository.saveConversation(conversation.snapshot());
    return this.toView(conversation, actorId);
  }

  private async toView(conversation: Conversation, actorId: string): Promise<ChatConversation> {
    const view = conversation.viewFor(actorId);
    const peer = await this.requireActor(view.peerActorId);
    const messages = await this.repository.listMessages(conversation.id);
    const last = messages.at(-1);
    return {
      id: conversation.id,
      title: peer.name,
      kind: "direct",
      unreadCount: messages.filter((message) => message.actorId !== actorId && (!view.readAt || message.createdAt > view.readAt)).length,
      lastMessage: last?.body ?? "",
      archivedAt: view.preference.archivedAt,
      mutedAt: view.preference.mutedAt,
      updatedAt: conversation.updatedAt,
    };
  }

  private async requireActor(actorId: string): Promise<ChatActor> {
    const actor = await this.identities.findActor(actorId);
    if (!actor) throw new ChatNotFoundError("Actor is unavailable.");
    return actor;
  }

  private async requireConversation(actorId: string, conversationId: string) {
    const state = await this.repository.findConversation(conversationId);
    if (!state) throw new ChatNotFoundError("Conversation is unavailable.");
    const conversation = Conversation.restore(state);
    try { conversation.requireMember(actorId); } catch { throw new ChatAccessError("Conversation access is denied."); }
    return conversation;
  }
}

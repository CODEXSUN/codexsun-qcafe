import { randomUUID } from "node:crypto";
import type { ChatTurnResponse } from "@codexsun/contracts";
import type { ChatSidecar } from "./chat-types.js";

export class ChatService {
  readonly #sidecar: ChatSidecar;
  readonly #threads = new Map<string, string>();

  constructor(sidecar: ChatSidecar) {
    this.#sidecar = sidecar;
  }

  async send(input: { conversationId?: string; message: string }): Promise<ChatTurnResponse> {
    const conversationId = input.conversationId ?? randomUUID();
    const threadId = this.#threads.get(conversationId);
    if (input.conversationId && !threadId) throw new UnknownConversationError();

    const turn = await this.#sidecar.send({ message: input.message, threadId });
    this.#threads.set(conversationId, turn.threadId);
    return {
      activities: turn.activities,
      conversationId,
      message: turn.message,
      provider: "codex-sidecar",
      runId: randomUUID(),
      usage: turn.usage,
    };
  }
}

export class UnknownConversationError extends Error {
  constructor() {
    super("This conversation is not available on the current server process.");
  }
}

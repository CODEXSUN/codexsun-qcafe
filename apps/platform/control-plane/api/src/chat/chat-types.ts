import type { ChatActivity } from "@codexsun/contracts";

export type SidecarTurn = {
  activities: ChatActivity[];
  message: string;
  threadId: string;
  usage: {
    cachedInputTokens: number;
    inputTokens: number;
    outputTokens: number;
  } | null;
};

export interface ChatSidecar {
  send(input: { message: string; threadId?: string }): Promise<SidecarTurn>;
}

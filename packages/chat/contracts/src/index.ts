import { z } from "zod";

export const CHAT_API_PREFIX = "/api/v1/chat";
export const CHAT_LOCAL_ACCESS_TOKEN_PATH = `${CHAT_API_PREFIX}/access-tokens/local`;

export const createConversationSchema = z.object({ peerActorId: z.string().trim().min(1).max(200) });
export const sendMessageSchema = z.object({ body: z.string().trim().min(1).max(8_000), client: z.string().trim().min(1).max(50).optional() });
export const conversationPreferencesSchema = z.object({ archived: z.boolean().optional(), muted: z.boolean().optional() }).refine((value) => value.archived !== undefined || value.muted !== undefined);
export const historyQuerySchema = z.object({ before: z.string().optional(), limit: z.coerce.number().int().min(1).max(100).default(50) });

export type ChatActor = { uuid: string; name: string; email: string };
export type ChatConversation = {
  id: string;
  title: string;
  kind: "direct";
  unreadCount: number;
  lastMessage: string;
  archivedAt: string | null;
  mutedAt: string | null;
  updatedAt: string;
};
export type ChatMessage = {
  uuid: string;
  actorId: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  deliveredAt: string | null;
};
export type ChatHistory = { items: ChatMessage[]; nextCursor: string | null };
export type ChatEvent = { type: "message.created" | "conversation.updated"; actorIds: string[]; conversationId: string; message?: ChatMessage };
export type ChatApiSuccess<T> = { success: true; data: T };
export type ChatApiFailure = { success: false; error: { code: string; message: string } };
export type ChatLocalAccessToken = { accessToken: string; expiresAt: string };

export function success<T>(data: T): ChatApiSuccess<T> {
  return { success: true, data };
}

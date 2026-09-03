import { turnSchema, type AgentTurn } from "@codexsun/zetro-api/contracts";
export type Message = { id: string; role: "You" | "Zetro"; content: string };
export type SavedConversation = { id: string; agentId: string; conversationId?: string; title: string; messages: Message[]; updatedAt: string; archived: boolean; turn?: AgentTurn };
const key = "codexsun.zetro.conversations.v1";

export function readHistory(storage: Pick<Storage, "getItem">): SavedConversation[] {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(key) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is SavedConversation => Boolean(item && typeof item.id === "string" && typeof item.agentId === "string" && typeof item.title === "string" && typeof item.updatedAt === "string" && typeof item.archived === "boolean" && (item.conversationId === undefined || typeof item.conversationId === "string") && Array.isArray(item.messages) && item.messages.every((message: Message) => message && typeof message.id === "string" && ["You", "Zetro"].includes(message.role) && typeof message.content === "string"))).map((item) => ({ ...item, turn: turnSchema.safeParse(item.turn).success ? turnSchema.parse(item.turn) : undefined }));
  } catch { return []; }
}
export function saveHistory(storage: Pick<Storage, "setItem">, history: SavedConversation[]) {
  storage.setItem(key, JSON.stringify(history));
}
export function exportConversation(conversation: SavedConversation) {
  return JSON.stringify({ title: conversation.title, agentId: conversation.agentId, conversationId: conversation.conversationId, messages: conversation.messages, updatedAt: conversation.updatedAt }, null, 2);
}

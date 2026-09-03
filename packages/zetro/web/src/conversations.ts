export type Exchange = { id: string; prompt: string; result: string; activities?: { id: string; label: string; status: string }[] };
export type Conversation = { id: string; title: string; updatedAt: string; exchanges: Exchange[] };
const key = "zetro.prompt-conversations.v1";

export function loadConversations(storage: Pick<Storage, "getItem">): Conversation[] {
  const items: unknown = JSON.parse(storage.getItem(key) ?? "[]");
  if (!Array.isArray(items)) throw new Error("Invalid conversation history.");
  return items.filter((item): item is Conversation => typeof item?.id === "string" && typeof item.title === "string" && Number.isFinite(Date.parse(item.updatedAt)) && Array.isArray(item.exchanges) && item.exchanges.every((entry: Exchange) => typeof entry?.id === "string" && typeof entry.prompt === "string" && typeof entry.result === "string"));
}

export function saveConversations(storage: Pick<Storage, "setItem">, items: Conversation[]) {
  storage.setItem(key, JSON.stringify(items));
}

export function conversationGroup(updatedAt: string, now = new Date()) {
  const date = new Date(updatedAt);
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const day = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const age = Math.floor((today - day) / 86_400_000);
  return age <= 0 ? "Today" : age === 1 ? "Yesterday" : age < 7 ? "Previous 7 days" : "Older";
}

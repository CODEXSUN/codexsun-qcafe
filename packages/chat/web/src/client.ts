export type Contact = { uuid: string; name: string; email: string };
export type Conversation = { id: string; title: string; kind: "direct" | "device"; unreadCount: number; lastMessage: string; archivedAt: string | null; mutedAt: string | null; updatedAt: string };
export type Message = { uuid: string; actorId: string; body: string; createdAt: string; readAt: string | null; deliveredAt: string | null };
export type History = { items: Message[]; nextCursor: string | null };

export class ChatClient {
  constructor(private readonly baseUrl: string, private readonly token: string, private readonly transport: typeof fetch = (input, init) => fetch(input, init)) {}
  async request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
    const response = await this.transport(`${this.baseUrl.replace(/\/$/, "")}${path}`, {
      method, signal: AbortSignal.timeout(15000), redirect: "error",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!response.headers.get("content-type")?.includes("application/json")) throw new Error("DevKit returned a non-JSON response. Check the API URL and proxy.");
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(response.status === 401 ? "Your DevKit session expired. Connect again." : result.error?.message ?? `DevKit returned ${response.status}.`);
    return result.data as T;
  }
  profile() { return this.request<Contact>("/identity/profile"); }
  contacts() { return this.request<Contact[]>("/api/devkit/messenger/contacts"); }
  conversations() { return this.request<Conversation[]>("/api/devkit/messenger/conversations"); }
  open(peerActorId: string) { return this.request<Conversation>("/api/devkit/messenger/conversations", "POST", { peerActorId }); }
  history(id: string, before?: string) { return this.request<History>(`${this.path(id)}/message-history?limit=50${before ? `&before=${encodeURIComponent(before)}` : ""}`); }
  send(id: string, body: string) { return this.request<Message>(`${this.path(id)}/messages`, "POST", { body, client: "web" }); }
  read(id: string) { return this.request(`${this.path(id)}/read`, "POST"); }
  preferences(id: string, input: { archived?: boolean; muted?: boolean }) { return this.request(`${this.path(id)}/preferences`, "POST", input); }
  private path(id: string) { return `/api/devkit/messenger/conversations/${encodeURIComponent(id)}`; }
}

export function mergeMessages(current: Message[], incoming: Message[]) {
  const unique = new Map(current.map((message) => [message.uuid, message]));
  incoming.forEach((message) => unique.set(message.uuid, message));
  return [...unique.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.uuid.localeCompare(b.uuid));
}

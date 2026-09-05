import { CHAT_API_PREFIX, type ChatActor, type ChatConversation, type ChatHistory, type ChatMessage } from "@codexsun/chat-contracts";

export type Contact = ChatActor;
export type Conversation = ChatConversation;
export type Message = ChatMessage;
export type History = ChatHistory;

export interface ChatTransport {
  watch?(onChange: () => void): () => void;
  profile(): Promise<Contact>;
  contacts(): Promise<Contact[]>;
  conversations(): Promise<Conversation[]>;
  open(peerActorId: string): Promise<Conversation>;
  history(id: string, before?: string): Promise<History>;
  send(id: string, body: string): Promise<Message>;
  read(id: string): Promise<unknown>;
  preferences(id: string, input: { archived?: boolean; muted?: boolean }): Promise<unknown>;
}

export type ChatTransportFactory = (baseUrl: string, token: string) => ChatTransport;

abstract class JsonChatClient implements ChatTransport {
  constructor(
    protected readonly baseUrl: string,
    protected readonly token: string,
    private readonly transport: typeof fetch = (input, init) => fetch(input, init),
  ) {}

  protected async request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
    const response = await this.transport(`${this.baseUrl.replace(/\/$/u, "")}${path}`, {
      method,
      signal: AbortSignal.timeout(15_000),
      redirect: "error",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!response.headers.get("content-type")?.includes("application/json")) throw new Error("Chat returned a non-JSON response. Check the API URL and proxy.");
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(response.status === 401 ? "Your Chat session expired. Connect again." : result.error?.message ?? `Chat returned ${response.status}.`);
    return result.data as T;
  }

  abstract profile(): Promise<Contact>;
  abstract contacts(): Promise<Contact[]>;
  abstract conversations(): Promise<Conversation[]>;
  abstract open(peerActorId: string): Promise<Conversation>;
  abstract history(id: string, before?: string): Promise<History>;
  abstract send(id: string, body: string): Promise<Message>;
  abstract read(id: string): Promise<unknown>;
  abstract preferences(id: string, input: { archived?: boolean; muted?: boolean }): Promise<unknown>;
}

export class CentralChatClient extends JsonChatClient {
  watch(onChange: () => void) {
    let stopped = false;
    let socket: WebSocket | undefined;
    let retry: ReturnType<typeof setTimeout>;
    const connect = async () => {
      try {
        const response = await fetch(`${this.baseUrl}/api/v1/chat/realtime/tickets`, { method: "POST", headers: { authorization: `Bearer ${this.token}` } });
        if (!response.ok || stopped) return;
        const { ticket } = await response.json();
        const url = new URL("/chat/ws", this.baseUrl);
        url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
        socket = new WebSocket(url, [`ticket.${ticket}`]);
        socket.onmessage = () => onChange();
        socket.onclose = () => { if (!stopped) retry = setTimeout(() => { void connect(); }, 5000); };
      } catch { if (!stopped) retry = setTimeout(() => { void connect(); }, 5000); }
    };
    void connect();
    return () => { stopped = true; clearTimeout(retry); socket?.close(); };
  }
  profile() { return this.request<Contact>(`${CHAT_API_PREFIX}/profile`); }
  contacts() { return this.request<Contact[]>(`${CHAT_API_PREFIX}/contacts`); }
  conversations() { return this.request<Conversation[]>(`${CHAT_API_PREFIX}/conversations`); }
  open(peerActorId: string) { return this.request<Conversation>(`${CHAT_API_PREFIX}/conversations`, "POST", { peerActorId }); }
  history(id: string, before?: string) { return this.request<History>(`${this.path(id)}/messages?limit=50${before ? `&before=${encodeURIComponent(before)}` : ""}`); }
  send(id: string, body: string) { return this.request<Message>(`${this.path(id)}/messages`, "POST", { body, client: "web" }); }
  read(id: string) { return this.request(`${this.path(id)}/read`, "POST"); }
  preferences(id: string, input: { archived?: boolean; muted?: boolean }) { return this.request(`${this.path(id)}/preferences`, "POST", input); }
  private path(id: string) { return `${CHAT_API_PREFIX}/conversations/${encodeURIComponent(id)}`; }
}

export class DevKitChatClient extends JsonChatClient {
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

export const ChatClient = CentralChatClient;

export function mergeMessages(current: Message[], incoming: Message[]) {
  const unique = new Map(current.map((message) => [message.uuid, message]));
  incoming.forEach((message) => unique.set(message.uuid, message));
  return [...unique.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.uuid.localeCompare(b.uuid));
}

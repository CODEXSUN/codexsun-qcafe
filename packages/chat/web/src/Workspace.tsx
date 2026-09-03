import { Fragment, useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { AtSign, CheckCheck, CircleHelp, Copy, EllipsisVertical, Hash, MessageSquare, Paperclip, Phone, Plus, Search, Send, Slash, Video } from "lucide-react";
import { Avatar, AvatarFallback } from "@codexsun/ui/components/avatar";
import { Button } from "@codexsun/ui/components/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@codexsun/ui/components/dropdown-menu";
import { MdiTopologyRegion, type MdiTopologyAdapter } from "@codexsun/ui-desk";
import { ChatClient, mergeMessages, type Contact, type Conversation, type Message } from "./client.js";

export const chatWorkspaceAddon = {
  id: "chat", label: "Chat", icon: MessageSquare,
  navigation: { id: "chat", hideSearch: true, searchPlaceholder: "Chat workspace", groups: [] },
  renderPage: (_page: string, topology?: MdiTopologyAdapter, target?: HTMLElement | null) => <ChatWorkspace topology={topology} target={target} />,
};

const localDemo = import.meta.env.DEV && import.meta.env.VITE_CHAT_LOCAL_DEMO === "true" && ["127.0.0.1", "localhost"].includes(window.location.hostname);

export function ChatWorkspace({ topology, target }: { topology?: MdiTopologyAdapter; target?: HTMLElement | null }) {
  const [url, setUrl] = useState(localDemo ? "http://127.0.0.1:9051" : "http://127.0.0.1:9050");
  const [token, setToken] = useState(localDemo ? "local-demo-only" : "");
  const [client, setClient] = useState<ChatClient>();
  const [profile, setProfile] = useState<Contact>();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [active, setActive] = useState<Conversation>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [before, setBefore] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [newChat, setNewChat] = useState(false);
  const [archived, setArchived] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const bottom = useRef<HTMLDivElement>(null);
  const latestMessageId = messages.at(-1)?.uuid;
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [latestMessageId]);
  const draft = active ? drafts[active.id] ?? "" : "";

  async function action(operation: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setError("");
    try { await operation(); } catch (cause) { setError(cause instanceof Error ? cause.message : "The connection failed."); }
    finally { setBusy(false); }
  }
  useEffect(() => { if (localDemo) void connect(); }, []);

  async function connect(event?: FormEvent) {
    event?.preventDefault();
    await action(async () => {
      const endpoint = new URL(url);
      if (endpoint.protocol !== "https:" && !(endpoint.protocol === "http:" && ["127.0.0.1", "localhost"].includes(endpoint.hostname))) throw new Error("Use HTTPS for a remote DevKit connection.");
      const connection = new ChatClient(endpoint.origin, localDemo && endpoint.origin === "http://127.0.0.1:9051" ? "local-demo-only" : token);
      const [identity, threads, people] = await Promise.all([connection.profile(), connection.conversations(), connection.contacts()]);
      setProfile(identity); setConversations(threads.filter((item) => item.kind === "direct")); setContacts(people); setClient(connection); setToken("");
    });
  }
  async function refresh() {
    if (!client) return;
    const items = (await client.conversations()).filter((item) => item.kind === "direct");
    setConversations(items);
    setActive((current) => current ? items.find((item) => item.id === current.id) : undefined);
  }
  async function select(conversation: Conversation) {
    if (!client || busy) return;
    const request = ++generation.current;
    setActive(conversation); setMessages([]); setBefore(null); setNewChat(false);
    await action(async () => {
      const page = await client.history(conversation.id);
      if (request !== generation.current) return;
      setMessages(mergeMessages([], page.items)); setBefore(page.nextCursor);
      await client.read(conversation.id); await refresh();
    });
  }
  useEffect(() => {
    if (!client || !active) return;
    const id = active.id;
    const request = generation.current;
    let stopped = false;
    let pending = false;
    const timer = window.setInterval(() => {
      if (pending || document.hidden) return;
      pending = true;
      void Promise.all([client.history(id), client.conversations()]).then(([page, items]) => {
        if (stopped || request !== generation.current) return;
        setMessages((current) => mergeMessages(current, page.items));
        setConversations(items.filter((item) => item.kind === "direct"));
      }).catch(() => { if (!stopped) setError("Live refresh failed. Check your connection and refresh."); }).finally(() => { pending = false; });
    }, 5000);
    return () => { stopped = true; clearInterval(timer); };
  }, [client, active?.id]);
  function disconnect() {
    setToken(localDemo ? "local-demo-only" : ""); generation.current++; setClient(undefined); setProfile(undefined); setConversations([]); setContacts([]); setActive(undefined); setMessages([]); setDrafts({}); setError("");
  }
  async function send(event: FormEvent) {
    event.preventDefault();
    if (!client || !active || !draft.trim()) return;
    const id = active.id;
    const body = draft.trim();
    await action(async () => {
      const message = await client.send(id, body);
      setMessages((current) => mergeMessages(current, [message]));
      setDrafts((current) => ({ ...current, [id]: "" })); await refresh();
    });
  }
  const navigation = <ChatSidecar active={active} archived={archived} busy={busy} client={client} conversations={conversations} onNewChat={() => setNewChat((open) => !open)} onSelect={(conversation) => void select(conversation)} query={query} setArchived={setArchived} setQuery={setQuery} topology={topology} />;
  return <section aria-label="Chat workspace" className="ito-region relative flex h-full min-h-0 flex-col bg-background [&>.technical-label]:!left-auto [&>.technical-label]:!right-3" {...topology?.regionProps("c1")}>
    {topology?.marker("c1")}
    {target && createPortal(navigation, target)}
    <ChatConversationHeader active={active} busy={busy} client={client} onArchive={() => void action(async () => { if (!active || !client) return; await client.preferences(active.id, { archived: !active.archivedAt }); await refresh(); })} onUnavailable={(feature) => setError(`${feature} is not available from the connected DevKit account.`)} topology={topology} />
    {error && <MdiTopologyRegion id="c1.2" topology={topology}><div role="alert" className="border-b border-border p-4 text-sm text-destructive">{error}</div></MdiTopologyRegion>}
    {!client ? <form {...topology?.regionProps("c4")} onSubmit={(event) => void connect(event)} className="ito-region relative mx-auto flex w-full max-w-lg flex-col gap-4 p-8">{topology?.marker("c4")}<h2 className="text-xl font-medium">Your conversations, connected</h2><p className="text-sm leading-6 text-muted-foreground">Use your DevKit API URL and an existing access token. The token stays in memory for this session.</p><MdiTopologyRegion id="c4.1" topology={topology}><label className="grid gap-2 text-sm">DevKit API URL<input required type="url" className="rounded-lg border border-input bg-background p-3" value={url} onChange={(event) => setUrl(event.target.value)} /></label></MdiTopologyRegion><MdiTopologyRegion id="c4.2" topology={topology}><label className="grid gap-2 text-sm">Access token<input required autoComplete="off" type="password" className="rounded-lg border border-input bg-background p-3" value={token} onChange={(event) => setToken(event.target.value)} /></label></MdiTopologyRegion><MdiTopologyRegion id="c4.3" topology={topology}><Button disabled={busy || !token.trim()}>{busy ? "Connecting…" : "Connect DevKit"}</Button></MdiTopologyRegion></form>
    : newChat ? <div {...topology?.regionProps("c5")} className="ito-region relative overflow-y-auto p-6">{topology?.marker("c5")}<h2 className="mb-4 font-medium">Start a conversation</h2>{contacts.filter((contact) => contact.uuid !== profile?.uuid).map((contact) => <Button key={contact.uuid} className="mb-2 flex w-full justify-start" variant="ghost" disabled={busy} onClick={() => void action(async () => { const conversation = await client.open(contact.uuid); generation.current++; setActive(conversation); setMessages([]); setBefore(null); setNewChat(false); const page = await client.history(conversation.id); setMessages(mergeMessages([], page.items)); setBefore(page.nextCursor); await refresh(); })}>{contact.name} · {contact.email}</Button>)}{!contacts.length && <p className="text-muted-foreground">No contacts available in DevKit.</p>}</div>
    : !active ? <MdiTopologyRegion id="c1.1" topology={topology} className="flex-1"><div className="grid flex-1 place-content-center gap-3 p-8 text-center"><MessageSquare className="mx-auto size-8 text-muted-foreground" /><h2 className="text-xl font-medium">Choose a conversation</h2><p className="text-sm text-muted-foreground">Your direct messages appear in the left navigation.</p></div></MdiTopologyRegion>
    : <><MdiTopologyRegion id="c7" topology={topology} className="min-h-0 flex-1 overflow-y-auto p-6"><div className="mx-auto max-w-3xl space-y-5">{before && <MdiTopologyRegion id="c7.1" topology={topology}><Button variant="outline" disabled={busy} onClick={() => void action(async () => { const page = await client.history(active.id, before); setMessages((current) => mergeMessages(page.items, current)); setBefore(page.nextCursor); })}>Load older messages</Button></MdiTopologyRegion>}<MdiTopologyRegion id="c7.2" topology={topology} className="space-y-5">{messages.map((message, index) => <Fragment key={message.uuid}>{showDateSeparator(messages[index - 1], message) && <MessageDateSeparator date={message.createdAt} />}<article className={`max-w-[90%] rounded-2xl border border-border px-4 py-3 shadow-sm ${message.actorId === profile?.uuid ? "ml-auto bg-accent" : "bg-muted/40"}`}><p className="mb-2 text-xs text-muted-foreground">{message.actorId === profile?.uuid ? "You" : active.title}</p><p className="whitespace-pre-wrap text-sm leading-6">{message.body}</p><div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground"><span>{new Date(message.createdAt).toLocaleString()} · {message.readAt ? "Read" : message.deliveredAt ? "Delivered" : "Sent"}</span><Button aria-label="Copy message" title="Copy message" variant="ghost" size="icon" onClick={() => void action(async () => navigator.clipboard.writeText(message.body))}><Copy className="size-3" /></Button></div></article></Fragment>)}{!messages.length && <p className="text-sm text-muted-foreground">No messages in this conversation.</p>}<div ref={bottom} /></MdiTopologyRegion></div></MdiTopologyRegion>
    <MdiTopologyRegion id="c8" topology={topology} className="shrink-0 border-t border-border bg-background p-4"><form onSubmit={(event) => void send(event)} className="rounded-xl border border-input bg-card p-3 shadow-sm"><MdiTopologyRegion id="c8.1" topology={topology}><textarea aria-label="Private message" maxLength={8000} disabled={busy} className="min-h-20 w-full resize-none bg-transparent p-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="Write a private message" value={draft} onChange={(event) => setDrafts((current) => ({ ...current, [active.id]: event.target.value }))} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} /></MdiTopologyRegion><div className="flex items-center justify-between gap-3 px-1 pt-2"><MdiTopologyRegion id="c8.2" topology={topology} className="flex items-center gap-1"><MdiTopologyRegion id="c8.2.1" topology={topology}><ComposerTool icon={Paperclip} label="Attach a file" /></MdiTopologyRegion><MdiTopologyRegion id="c8.2.2" topology={topology}><ComposerTool icon={AtSign} label="Mention someone" /></MdiTopologyRegion><MdiTopologyRegion id="c8.2.3" topology={topology}><ComposerTool icon={Slash} label="Commands" /></MdiTopologyRegion><MdiTopologyRegion id="c8.2.4" topology={topology}><ComposerTool icon={Hash} label="Add topic" /></MdiTopologyRegion><MdiTopologyRegion id="c8.2.5" topology={topology}><ComposerTool icon={CircleHelp} label="Composer help" /></MdiTopologyRegion></MdiTopologyRegion><MdiTopologyRegion id="c8.3" topology={topology}><Button type="submit" aria-label="Send private message" disabled={busy || !draft.trim()} className="rounded-full bg-muted text-muted-foreground shadow-none hover:bg-muted enabled:bg-foreground enabled:text-background enabled:hover:bg-foreground/90" size="icon"><Send className="size-4" /></Button></MdiTopologyRegion></div></form></MdiTopologyRegion></>}
  </section>;
}

function ChatConversationHeader({ active, busy, client, onArchive, onUnavailable, topology }: {
  active?: Conversation;
  busy: boolean;
  client?: ChatClient;
  onArchive: () => void;
  onUnavailable: (feature: string) => void;
  topology?: MdiTopologyAdapter;
}) {
  const name = active?.title ?? "Chat";
  const canManageConversation = Boolean(active && client);

  return <header {...topology?.regionProps("c3")} className="ito-region relative flex min-h-20 items-center justify-between gap-4 border-b border-border bg-background px-5 py-4">
    {topology?.marker("c3")}
    <MdiTopologyRegion id="c3.1" topology={topology} className="flex min-w-0 items-center gap-3">
      <MdiTopologyRegion id="c3.1.1" topology={topology} className="relative">
        <Avatar aria-hidden="true" className="size-10 border border-border bg-muted">
          <AvatarFallback>{initials(name)}</AvatarFallback>
        </Avatar>
        {canManageConversation && <span aria-label="Online" className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-background bg-emerald-500" />}
      </MdiTopologyRegion>
      <MdiTopologyRegion id="c3.1.2" topology={topology} className="min-w-0">
        <h1 className="truncate text-sm font-semibold text-foreground">{name}</h1>
        <p role="status" className="text-xs text-emerald-700 dark:text-emerald-400">{canManageConversation ? "Online" : "Select a conversation"}</p>
      </MdiTopologyRegion>
    </MdiTopologyRegion>
    {canManageConversation && <MdiTopologyRegion id="c3.2" topology={topology} className="flex shrink-0 items-center gap-1">
      <MdiTopologyRegion id="c3.2.1" topology={topology}>
        <Button aria-label="Start video call" className="rounded-full" disabled={busy} onClick={() => onUnavailable("Video calls")} size="icon" title="Start video call" variant="outline"><Video /></Button>
      </MdiTopologyRegion>
      <MdiTopologyRegion id="c3.2.2" topology={topology}>
        <Button aria-label="Start audio call" className="rounded-full" disabled={busy} onClick={() => onUnavailable("Audio calls")} size="icon" title="Start audio call" variant="outline"><Phone /></Button>
      </MdiTopologyRegion>
      <MdiTopologyRegion id="c3.2.3" topology={topology}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button aria-label="Conversation options" className="rounded-full" disabled={busy} size="icon" title="Conversation options" variant="ghost"><EllipsisVertical /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="ito-inspector-popover min-w-44">
            <DropdownMenuItem {...topology?.regionProps("c3.2.3.1")} className="ito-region cursor-pointer" onSelect={onArchive}>{active?.archivedAt ? "Unarchive this chat" : "Archive this chat"}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem {...topology?.regionProps("c3.2.3.2")} className="ito-region cursor-pointer text-destructive focus:text-destructive" onSelect={() => onUnavailable("Deleting chats")}>Delete this chat</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </MdiTopologyRegion>
    </MdiTopologyRegion>}
  </header>;
}

function ChatSidecar({ active, archived, busy, client, conversations, onNewChat, onSelect, query, setArchived, setQuery, topology }: {
  active?: Conversation;
  archived: boolean;
  busy: boolean;
  client?: ChatClient;
  conversations: Conversation[];
  onNewChat: () => void;
  onSelect: (conversation: Conversation) => void;
  query: string;
  setArchived: (archived: boolean) => void;
  setQuery: (query: string) => void;
  topology?: MdiTopologyAdapter;
}) {
  const visibleConversations = conversations
    .filter((item) => Boolean(item.archivedAt) === archived)
    .filter((item) => `${item.title} ${item.lastMessage}`.toLowerCase().includes(query.toLowerCase()))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

  return <aside aria-label="Chat conversations" className="ito-region relative flex h-full min-h-0 flex-col bg-background" {...topology?.regionProps("c2.1.1")}>
    {topology?.marker("c2.1.1")}
    <div className="flex items-center justify-between border-b border-border px-4 py-4">
      <h2 className="text-xl font-semibold tracking-tight text-foreground">Chats</h2>
      <MdiTopologyRegion id="c2.1.1.1" topology={topology}>
        <Button aria-label="New conversation" className="rounded-full" disabled={!client || busy} onClick={onNewChat} size="icon" title="New conversation" variant="outline"><Plus /></Button>
      </MdiTopologyRegion>
    </div>
    <MdiTopologyRegion id="c2.1.1.2" topology={topology} className="px-3 py-3">
      <div className="flex h-9 items-center gap-2 rounded-lg border border-input bg-background px-3 focus-within:ring-1 focus-within:ring-ring">
        <Search aria-hidden="true" className="size-4 text-muted-foreground" />
        <input aria-label="Search chats" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" placeholder="Search chats" value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>
    </MdiTopologyRegion>
    <MdiTopologyRegion id="c2.1.1.3" topology={topology} className="flex items-center justify-between px-4 pb-2 text-xs text-muted-foreground">
      <span>{archived ? "Archived chats" : "Recent chats"}</span>
      <Button className="h-auto px-1 py-0 text-xs" disabled={!client || busy} onClick={() => setArchived(!archived)} title={archived ? "Show active chats" : "Show archived chats"} variant="ghost">{archived ? "Active" : "Archived"}</Button>
    </MdiTopologyRegion>
    <MdiTopologyRegion id="c2.1.1.4" topology={topology} className="min-h-0 flex-1 divide-y divide-border overflow-y-auto border-y border-border">
      {visibleConversations.map((conversation) => <ChatConversationListItem active={active?.id === conversation.id} busy={busy} conversation={conversation} key={conversation.id} onSelect={onSelect} />)}
      {client && !visibleConversations.length && <p className="p-4 text-sm text-muted-foreground">No chats found.</p>}
    </MdiTopologyRegion>
  </aside>;
}

function ChatConversationListItem({ active, busy, conversation, onSelect }: { active: boolean; busy: boolean; conversation: Conversation; onSelect: (conversation: Conversation) => void }) {
  return <button aria-pressed={active} className={`flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent hover:text-accent-foreground ${active ? "bg-accent" : ""}`} disabled={busy} onClick={() => onSelect(conversation)}>
    <div className="relative shrink-0">
      <Avatar className="size-10 border border-border bg-muted"><AvatarFallback>{initials(conversation.title)}</AvatarFallback></Avatar>
      <span aria-label="Online" className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-background bg-emerald-500" />
    </div>
    <span className="min-w-0 flex-1">
      <span className="flex items-center justify-between gap-2"><strong className="truncate text-sm font-medium">{conversation.title}</strong><time className="shrink-0 text-xs text-muted-foreground">{formatConversationTime(conversation.updatedAt)}</time></span>
      <span className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground"><CheckCheck aria-hidden="true" className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" /><span className="truncate">{conversation.lastMessage || "No messages yet"}</span></span>
    </span>
    {conversation.unreadCount > 0 && <span aria-label={`${conversation.unreadCount} unread messages`} className="grid size-5 shrink-0 place-items-center rounded-full bg-emerald-600 text-xs font-semibold text-white">{conversation.unreadCount}</span>}
  </button>;
}

function ComposerTool({ icon: Icon, label }: { icon: typeof Paperclip; label: string }) {
  return <Button aria-label={label} className="text-muted-foreground" size="icon" title={label} type="button" variant="ghost"><Icon aria-hidden="true" className="size-4" /></Button>;
}

function MessageDateSeparator({ date }: { date: string }) {
  return <div className="flex items-center gap-3 py-2 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" /><span className="rounded-full border border-border bg-background px-3 py-1">{new Date(date).toLocaleDateString()}</span><span className="h-px flex-1 bg-border" /></div>;
}

function showDateSeparator(previous: Message | undefined, current: Message) {
  return !previous || new Date(previous.createdAt).toDateString() !== new Date(current.createdAt).toDateString();
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "C";
}

function formatConversationTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

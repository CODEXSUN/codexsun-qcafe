import { Fragment, useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { AtSign, Calendar, Check, CheckCheck, ChevronDown, CircleHelp, Copy, EllipsisVertical, Forward, Hash, Info, MessageSquare, Paperclip, Phone, Plus, Reply, Search, Send, Slash, Smile, Video } from "lucide-react";
import { Avatar, AvatarFallback } from "@codexsun/ui/components/avatar";
import { Button } from "@codexsun/ui/components/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@codexsun/ui/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@codexsun/ui/components/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@codexsun/ui/components/ui/popover";
import { MdiTopologyRegion, type MdiTopologyAdapter } from "@codexsun/ui-desk";
import { CentralChatClient, mergeMessages, type ChatTransport, type ChatTransportFactory, type Contact, type Conversation, type Message } from "./client.js";
import { clearChatConnection, readChatConnection, subscribeToChatConnection } from "./connection-session.js";

export type ChatWorkspaceOptions = {
  id?: string;
  label?: string;
  defaultApiUrl?: string;
  demoApiUrl?: string;
  demoToken?: string;
  localDemo?: boolean;
  transportFactory?: ChatTransportFactory;
};

const defaultOptions: Required<Omit<ChatWorkspaceOptions, "transportFactory">> = {
  id: "chat",
  label: "Chat",
  defaultApiUrl: "http://127.0.0.1:4165",
  demoApiUrl: "http://127.0.0.1:4165",
  demoToken: "local-demo-only",
  localDemo: false,
};

export function createChatWorkspaceAddon(options: ChatWorkspaceOptions = {}) {
  const resolved = { ...defaultOptions, ...options };
  return {
  id: resolved.id, label: resolved.label, icon: MessageSquare,
  navigation: { id: "chat", hideSearch: true, searchPlaceholder: "Chat workspace", groups: [] },
  renderPage: (_page: string, topology?: MdiTopologyAdapter, target?: HTMLElement | null) => <ChatWorkspace options={resolved} topology={topology} target={target} />,
  };
}

export const chatWorkspaceAddon = createChatWorkspaceAddon({
  defaultApiUrl: import.meta.env.VITE_CHAT_API_URL || "http://127.0.0.1:4165",
  demoApiUrl: import.meta.env.VITE_CHAT_DEMO_API_URL || "http://127.0.0.1:4165",
  demoToken: import.meta.env.VITE_CHAT_DEMO_TOKEN || "local-demo-only",
  localDemo: import.meta.env.VITE_CHAT_LOCAL_DEMO === "true",
});

function isLoopbackBrowser() {
  return ["127.0.0.1", "localhost"].includes(window.location.hostname);
};

export function ChatWorkspace({ options = defaultOptions, topology, target }: { options?: ChatWorkspaceOptions; topology?: MdiTopologyAdapter; target?: HTMLElement | null }) {
  const resolved = { ...defaultOptions, ...options };
  const localDemo = resolved.localDemo && isLoopbackBrowser();
  const initialConnection = useRef(readChatConnection());
  const [url, setUrl] = useState(initialConnection.current?.apiUrl ?? (localDemo ? resolved.demoApiUrl : resolved.defaultApiUrl));
  const [token, setToken] = useState(initialConnection.current?.accessToken ?? (localDemo ? resolved.demoToken : ""));
  const [client, setClient] = useState<ChatTransport>();
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
  const [reactions, setReactions] = useState<Record<string, string[]>>({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const draft = active ? drafts[active.id] ?? "" : "";

  function handleToggleReaction(messageId: string, emoji: string) {
    setReactions((prev) => {
      const current = prev[messageId] ?? [];
      const exists = current.includes(emoji);
      const updated = exists ? current.filter((e) => e !== emoji) : [...current, emoji];
      return { ...prev, [messageId]: updated };
    });
  }

  function handleReply(message: Message) {
    if (!active) return;
    setDrafts((prev) => ({
      ...prev,
      [active.id]: `> ${message.body}\n\n${prev[active.id] ?? ""}`,
    }));
    textareaRef.current?.focus();
  }

  function handleForward(message: Message) {
    if (!active) return;
    void navigator.clipboard.writeText(message.body);
    setDrafts((prev) => ({
      ...prev,
      [active.id]: `Forwarded: "${message.body}"\n\n${prev[active.id] ?? ""}`,
    }));
    textareaRef.current?.focus();
  }

  async function action(operation: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setError("");
    try { await operation(); } catch (cause) { setError(cause instanceof Error ? cause.message : "The connection failed."); }
    finally { setBusy(false); }
  }
  useEffect(() => {
    if (initialConnection.current) void connect(undefined, initialConnection.current);
    else if (localDemo) void connect();
    return subscribeToChatConnection((connection) => {
      setUrl(connection.apiUrl);
      setToken(connection.accessToken);
      void connect(undefined, connection);
    });
  }, []);

  async function connect(event?: FormEvent, override?: { apiUrl: string; accessToken: string }) {
    event?.preventDefault();
    await action(async () => {
      const endpoint = new URL(override?.apiUrl ?? url);
      if (endpoint.protocol !== "https:" && !(endpoint.protocol === "http:" && ["127.0.0.1", "localhost"].includes(endpoint.hostname))) throw new Error("Use HTTPS for a remote Chat connection.");
      const credential = override?.accessToken ?? (localDemo && endpoint.origin === new URL(resolved.demoApiUrl).origin ? resolved.demoToken : token);
      const connection = resolved.transportFactory?.(endpoint.origin, credential) ?? new CentralChatClient(endpoint.origin, credential);
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
    clearChatConnection(); setToken(localDemo ? resolved.demoToken : ""); generation.current++; setClient(undefined); setProfile(undefined); setConversations([]); setContacts([]); setActive(undefined); setMessages([]); setDrafts({}); setError("");
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
    <ChatConversationHeader
      active={active}
      busy={busy}
      client={client}
      contact={contacts.find((c) => c.name.toLowerCase() === active?.title.toLowerCase() || c.uuid === active?.id)}
      messageCount={messages.length}
      onArchive={() => void action(async () => { if (!active || !client) return; await client.preferences(active.id, { archived: !active.archivedAt }); await refresh(); })}
      onUnavailable={(feature) => setError(`${feature} is not available from the connected DevKit account.`)}
      topology={topology}
    />
    {error && <MdiTopologyRegion id="c1.2" topology={topology}><div role="alert" className="border-b border-border p-4 text-sm text-destructive">{error}</div></MdiTopologyRegion>}
    {!client ? <form {...topology?.regionProps("c4")} onSubmit={(event) => void connect(event)} className="ito-region relative mx-auto flex w-full max-w-lg flex-col gap-4 p-8">{topology?.marker("c4")}<h2 className="text-xl font-medium">Your conversations, connected</h2><p className="text-sm leading-6 text-muted-foreground">Use the local Chat API and a token generated in Settings. The token stays in memory for this session.</p><MdiTopologyRegion id="c4.1" topology={topology}><label className="grid gap-2 text-sm">Chat API URL<input required type="url" className="rounded-lg border border-input bg-background p-3" value={url} onChange={(event) => setUrl(event.target.value)} /></label></MdiTopologyRegion><MdiTopologyRegion id="c4.2" topology={topology}><label className="grid gap-2 text-sm">Access token<input required autoComplete="off" type="password" className="rounded-lg border border-input bg-background p-3" value={token} onChange={(event) => setToken(event.target.value)} /></label></MdiTopologyRegion><MdiTopologyRegion id="c4.3" topology={topology}><Button disabled={busy || !token.trim()}>{busy ? "Connecting…" : "Connect Chat"}</Button></MdiTopologyRegion></form>
    : newChat ? <div {...topology?.regionProps("c5")} className="ito-region relative overflow-y-auto p-6">{topology?.marker("c5")}<h2 className="mb-4 font-medium">Start a conversation</h2>{contacts.filter((contact) => contact.uuid !== profile?.uuid).map((contact) => <Button key={contact.uuid} className="mb-2 flex w-full justify-start" variant="ghost" disabled={busy} onClick={() => void action(async () => { const conversation = await client.open(contact.uuid); generation.current++; setActive(conversation); setMessages([]); setBefore(null); setNewChat(false); const page = await client.history(conversation.id); setMessages(mergeMessages([], page.items)); setBefore(page.nextCursor); await refresh(); })}>{contact.name} · {contact.email}</Button>)}{!contacts.length && <p className="text-muted-foreground">No contacts available in DevKit.</p>}</div>
    : !active ? <MdiTopologyRegion id="c1.1" topology={topology} className="flex-1"><div className="grid flex-1 place-content-center gap-3 p-8 text-center"><MessageSquare className="mx-auto size-8 text-muted-foreground" /><h2 className="text-xl font-medium">Choose a conversation</h2><p className="text-sm text-muted-foreground">Your direct messages appear in the left navigation.</p></div></MdiTopologyRegion>
    : <><MdiTopologyRegion id="c7" topology={topology} className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto w-full md:w-[75%] space-y-4">
          {before && (
            <MdiTopologyRegion id="c7.1" topology={topology} className="flex justify-center pb-2">
              <Button variant="outline" size="sm" disabled={busy} onClick={() => void action(async () => { const page = await client.history(active.id, before); setMessages((current) => mergeMessages(page.items, current)); setBefore(page.nextCursor); })}>
                Load older messages
              </Button>
            </MdiTopologyRegion>
          )}
          <MdiTopologyRegion id="c7.2" topology={topology} className="space-y-4">
            {[...messages]
              .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.uuid.localeCompare(b.uuid))
              .map((message, index, sortedList) => {
                const isMe = message.actorId === profile?.uuid;
                return (
                  <Fragment key={message.uuid}>
                    {showDateSeparator(sortedList[index - 1], message) && <MessageDateSeparator date={message.createdAt} />}
                    <ChatMessageItem
                      message={message}
                      isMe={isMe}
                      authorName={active.title}
                      reactions={reactions[message.uuid] ?? []}
                      onToggleReaction={(emoji) => handleToggleReaction(message.uuid, emoji)}
                      onCopy={() => void action(async () => navigator.clipboard.writeText(message.body))}
                      onReply={() => handleReply(message)}
                      onForward={() => handleForward(message)}
                    />
                  </Fragment>
                );
              })}
            {!messages.length && <p className="text-sm text-muted-foreground text-center py-8">No messages in this conversation.</p>}
            <div ref={bottom} />
          </MdiTopologyRegion>
        </div>
      </MdiTopologyRegion>
    <MdiTopologyRegion id="c8" topology={topology} className="shrink-0 bg-background p-4">
      <form onSubmit={(event) => void send(event)} className="mx-auto w-full md:w-[75%] rounded-xl border border-input bg-card p-3 shadow-sm">
        <MdiTopologyRegion id="c8.1" topology={topology}>
          <textarea
            ref={textareaRef}
            aria-label="Private message"
            maxLength={8000}
            disabled={busy}
            className="min-h-20 w-full resize-none bg-transparent px-2 pt-0.5 pb-2 text-sm border-0 shadow-none outline-none focus:outline-none focus:ring-0 focus:border-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
            placeholder="Write a private message"
            value={draft}
            onChange={(event) => setDrafts((current) => ({ ...current, [active.id]: event.target.value }))}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
          />
        </MdiTopologyRegion>
        <div className="flex items-center justify-between gap-3 px-1 pt-2">
          <MdiTopologyRegion id="c8.2" topology={topology} className="flex items-center gap-1">
            <MdiTopologyRegion id="c8.2.1" topology={topology}><ComposerTool icon={Paperclip} label="Attach a file" /></MdiTopologyRegion>
            <MdiTopologyRegion id="c8.2.2" topology={topology}><ComposerTool icon={AtSign} label="Mention someone" /></MdiTopologyRegion>
            <MdiTopologyRegion id="c8.2.3" topology={topology}><ComposerTool icon={Slash} label="Commands" /></MdiTopologyRegion>
            <MdiTopologyRegion id="c8.2.4" topology={topology}><ComposerTool icon={Hash} label="Add topic" /></MdiTopologyRegion>
            <MdiTopologyRegion id="c8.2.5" topology={topology}><ComposerTool icon={CircleHelp} label="Composer help" /></MdiTopologyRegion>
          </MdiTopologyRegion>
          <MdiTopologyRegion id="c8.3" topology={topology}>
            <Button
              type="submit"
              aria-label="Send private message"
              disabled={busy || !draft.trim()}
              className="rounded-full bg-muted text-muted-foreground shadow-none hover:bg-muted enabled:bg-foreground enabled:text-background enabled:hover:bg-foreground/90"
              size="icon"
            >
              <Send className="size-4" />
            </Button>
          </MdiTopologyRegion>
        </div>
      </form>
    </MdiTopologyRegion>
  </>}
  </section>;
}

function ChatConversationHeader({ active, busy, client, contact, messageCount = 0, onArchive, onUnavailable, topology }: {
  active?: Conversation;
  busy: boolean;
  client?: ChatTransport;
  contact?: Contact;
  messageCount?: number;
  onArchive: () => void;
  onUnavailable: (feature: string) => void;
  topology?: MdiTopologyAdapter;
}) {
  const name = active?.title ?? "Chat";
  const canManageConversation = Boolean(active && client);

  return <header {...topology?.regionProps("c3")} className="ito-region relative flex items-center justify-between gap-4 border-b border-border bg-background px-5 py-2">
    {topology?.marker("c3")}
    <MdiTopologyRegion id="c3.1" topology={topology} className="flex min-w-0 items-center gap-3">
      <MdiTopologyRegion id="c3.1.1" topology={topology} className="relative">
        <Avatar aria-hidden="true" className="size-8 border border-border bg-muted">
          <AvatarFallback className="text-xs font-medium">{initials(name)}</AvatarFallback>
        </Avatar>
        {canManageConversation && <span aria-label="Online" className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-background bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" />}
      </MdiTopologyRegion>
      <MdiTopologyRegion id="c3.1.2" topology={topology} className="flex min-w-0 items-center gap-2.5 text-xs">
        <h1 className="truncate text-sm font-semibold leading-none text-foreground">{name}</h1>
        <span className="text-muted-foreground/40">·</span>
        <span role="status" className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground">
          <span className={`size-2 rounded-full ${canManageConversation ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" : "bg-amber-500"}`} />
          <span>{canManageConversation ? "Online" : "Select a conversation"}</span>
        </span>
        {contact?.email && (
          <>
            <span className="text-muted-foreground/40 hidden sm:inline">·</span>
            <span className="truncate text-muted-foreground hidden sm:inline">{contact.email}</span>
          </>
        )}
      </MdiTopologyRegion>
    </MdiTopologyRegion>
    {canManageConversation && <MdiTopologyRegion id="c3.2" topology={topology} className="flex shrink-0 items-center gap-2">
      <MdiTopologyRegion id="c3.2.1" topology={topology}>
        <Button aria-label="Start video call" className="size-8 rounded-full border-border bg-background hover:bg-accent cursor-pointer" disabled={busy} onClick={() => onUnavailable("Video calls")} size="icon" title="Start video call" variant="outline"><Video className="size-4 text-foreground" /></Button>
      </MdiTopologyRegion>
      <MdiTopologyRegion id="c3.2.2" topology={topology}>
        <Button aria-label="Start audio call" className="size-8 rounded-full border-border bg-background hover:bg-accent cursor-pointer" disabled={busy} onClick={() => onUnavailable("Audio calls")} size="icon" title="Start audio call" variant="outline"><Phone className="size-4 text-foreground" /></Button>
      </MdiTopologyRegion>
      <MdiTopologyRegion id="c3.2.4" topology={topology}>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-8 rounded-full border-border bg-background hover:bg-accent cursor-pointer"
              title="Chat details"
              aria-label="Chat details"
            >
              <Info className="size-4 text-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 rounded-2xl border-border p-3 shadow-lg">
            <div className="flex items-center gap-3 border-b border-border pb-3">
              <Avatar className="size-10 border border-border bg-muted">
                <AvatarFallback>{initials(name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-semibold text-foreground">{name}</h3>
                {contact?.email ? (
                  <p className="truncate text-xs text-muted-foreground">{contact.email}</p>
                ) : (
                  <p className="truncate text-xs text-muted-foreground capitalize">{active?.kind ?? "Direct"} conversation</p>
                )}
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
                  <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Online</span>
                </div>
              </div>
            </div>
            <div className="py-2.5 space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 text-muted-foreground">
                <span>Conversation ID</span>
                <span className="font-mono text-[11px] text-foreground truncate max-w-[160px]">{active?.id}</span>
              </div>
              <div className="flex items-center justify-between py-1 text-muted-foreground">
                <span>Type</span>
                <span className="font-medium text-foreground capitalize">{active?.kind ?? "Direct"}</span>
              </div>
              <div className="flex items-center justify-between py-1 text-muted-foreground">
                <span>Last updated</span>
                <span className="text-foreground">{active?.updatedAt ? formatConversationTime(active.updatedAt) : "Recently"}</span>
              </div>
              <div className="flex items-center justify-between py-1 text-muted-foreground">
                <span>Messages loaded</span>
                <span className="font-medium text-foreground">{messageCount}</span>
              </div>
              <div className="flex items-center justify-between py-1 text-muted-foreground">
                <span>Archive status</span>
                <span className="text-foreground">{active?.archivedAt ? "Archived" : "Active"}</span>
              </div>
            </div>
            <div className="border-t border-border pt-2 flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs cursor-pointer"
                onClick={onArchive}
              >
                {active?.archivedAt ? "Unarchive" : "Archive"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs cursor-pointer text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => onUnavailable("Deleting chats")}
              >
                Delete
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </MdiTopologyRegion>
      <MdiTopologyRegion id="c3.2.3" topology={topology}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button aria-label="Conversation options" className="size-8 rounded-full border-border bg-background hover:bg-accent cursor-pointer" disabled={busy} size="icon" title="Conversation options" variant="outline">
              <EllipsisVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="ito-inspector-popover min-w-44 rounded-xl shadow-md border-border">
            <DropdownMenuItem {...topology?.regionProps("c3.2.3.1")} className="ito-region cursor-pointer text-xs" onSelect={onArchive}>{active?.archivedAt ? "Unarchive this chat" : "Archive this chat"}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem {...topology?.regionProps("c3.2.3.2")} className="ito-region cursor-pointer text-xs text-destructive focus:text-destructive" onSelect={() => onUnavailable("Deleting chats")}>Delete this chat</DropdownMenuItem>
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
  client?: ChatTransport;
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
    .sort((left, right) => left.updatedAt.localeCompare(right.updatedAt));

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

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

function formatDateSeparator(dateStr: string) {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (msgDate.getTime() === today.getTime()) return "Today";
  if (msgDate.getTime() === yesterday.getTime()) return "Yesterday";
  return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function formatMessageTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const day = date.toLocaleDateString([], { day: "2-digit", month: "short" });
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }).toLowerCase();

  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  const remainingHours = diffHours % 24;

  let ago = "";
  if (diffDays > 0) {
    ago = ` (${diffDays}d ${remainingHours}h ago)`;
  } else if (diffHours > 0) {
    ago = ` (${diffHours}h ago)`;
  } else {
    const diffMins = Math.floor(diffMs / (1000 * 60));
    ago = diffMins > 1 ? ` (${diffMins}m ago)` : " (just now)";
  }

  return `${day} - ${time}${ago}`;
}

function ChatMessageItem({
  message,
  isMe,
  authorName,
  reactions = [],
  onToggleReaction,
  onCopy,
  onReply,
  onForward,
}: {
  message: Message;
  isMe: boolean;
  authorName: string;
  reactions?: string[];
  onToggleReaction: (emoji: string) => void;
  onCopy: () => void;
  onReply: () => void;
  onForward: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <div
        className={`flex flex-col ${isMe ? "items-end ml-auto" : "items-start mr-auto"} max-w-[75%] w-fit`}
      >
        <div
          className={`group/row relative flex items-center gap-1.5 w-full ${
            isMe ? "justify-end" : "justify-start"
          }`}
        >
          <article
            className={`group/msg relative w-fit rounded-2xl p-3 shadow-2xs transition-colors ${
              isMe
                ? "bg-card text-foreground rounded-tr-xs border border-border/60"
                : "bg-muted/70 text-foreground rounded-tl-xs border border-border/50"
            }`}
          >
            <div className="flex items-center justify-between gap-4 mb-1">
              <span className="text-[11px] font-semibold text-muted-foreground">{isMe ? "You" : authorName}</span>
              <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={`size-5 rounded p-0 transition-opacity cursor-pointer ${
                      menuOpen ? "opacity-100" : "opacity-0 group-hover/msg:opacity-100"
                    } hover:bg-muted text-muted-foreground hover:text-foreground`}
                    title="Message options"
                    aria-label="Message options"
                  >
                    <ChevronDown className="size-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={isMe ? "end" : "start"} className="w-52 rounded-xl border border-border p-1.5 shadow-lg bg-background">
                  <div className="flex items-center justify-between gap-1 px-1 py-1 mb-1 border-b border-border/70">
                    {QUICK_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          onToggleReaction(emoji);
                          setMenuOpen(false);
                        }}
                        className="size-7 flex items-center justify-center rounded-full hover:bg-muted hover:scale-125 transition-transform text-base cursor-pointer"
                        title={`React ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  <DropdownMenuItem className="cursor-pointer text-xs flex items-center gap-2" onSelect={() => setInfoOpen(true)}>
                    <Info className="size-3.5 text-muted-foreground" />
                    <span>Message info</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer text-xs flex items-center gap-2" onSelect={onReply}>
                    <Reply className="size-3.5 text-muted-foreground" />
                    <span>Reply</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer text-xs flex items-center gap-2" onSelect={handleCopy}>
                    <Copy className="size-3.5 text-muted-foreground" />
                    <span>{copied ? "Copied!" : "Copy"}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer text-xs flex items-center gap-2" onSelect={onForward}>
                    <Forward className="size-3.5 text-muted-foreground" />
                    <span>Forward</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <p className="whitespace-pre-wrap break-words text-sm leading-6 pr-1">{message.body}</p>

            {reactions.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {reactions.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => onToggleReaction(emoji)}
                    className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/90 px-1.5 py-0.5 text-xs shadow-2xs hover:bg-muted cursor-pointer transition-colors"
                    title="Remove reaction"
                  >
                    <span>{emoji}</span>
                  </button>
                ))}
              </div>
            )}
          </article>

          <div
            className={`flex flex-col gap-1 items-center shrink-0 transition-opacity ${
              emojiOpen ? "opacity-100" : "opacity-0 group-hover/row:opacity-100 focus-within:opacity-100"
            }`}
          >
            <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-6 rounded-full bg-background border border-border/60 shadow-2xs hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                  title="React with emoji"
                  aria-label="React with emoji"
                >
                  <Smile className="size-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                side="top"
                align="center"
                className="flex items-center gap-1 rounded-full border border-border bg-background/95 px-2 py-1 shadow-lg backdrop-blur-sm w-auto"
              >
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      onToggleReaction(emoji);
                      setEmojiOpen(false);
                    }}
                    className="size-7 flex items-center justify-center rounded-full hover:bg-muted hover:scale-125 transition-transform text-base cursor-pointer"
                    title={`React ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </PopoverContent>
            </Popover>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onForward}
              className="size-6 rounded-full bg-background border border-border/60 shadow-2xs hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
              title="Forward message"
              aria-label="Forward message"
            >
              <Forward className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* Status and timestamp at bottom below card as small */}
        <div
          className={`mt-1 flex items-center gap-1.5 px-1 text-[10px] text-muted-foreground ${
            isMe ? "justify-end" : "justify-start"
          }`}
        >
          <span>{formatMessageTimestamp(message.createdAt)}</span>
          {isMe && (
            message.readAt ? (
              <span title="Read" className="inline-flex items-center gap-1 font-medium text-blue-500">
                <CheckCheck className="size-3 text-blue-500 shrink-0" />
                <span>Read</span>
              </span>
            ) : message.deliveredAt ? (
              <span title="Delivered" className="inline-flex items-center gap-1 text-muted-foreground">
                <CheckCheck className="size-3 text-muted-foreground/75 shrink-0" />
                <span>Delivered</span>
              </span>
            ) : (
              <span title="Sent" className="inline-flex items-center gap-1 text-muted-foreground">
                <Check className="size-3 text-muted-foreground/75 shrink-0" />
                <span>Sent</span>
              </span>
            )
          )}
        </div>
      </div>

      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl border-border bg-background">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Info className="size-4 text-primary" />
              Message Info
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Delivery details and timestamps for this message.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Sender</span>
              <span className="font-medium text-foreground">{isMe ? "You" : authorName}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Sent</span>
              <span className="text-foreground">{new Date(message.createdAt).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Delivered</span>
              <span className="text-foreground">{message.deliveredAt ? new Date(message.deliveredAt).toLocaleString() : "Delivered to recipient"}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Read</span>
              <span className="text-foreground">{message.readAt ? new Date(message.readAt).toLocaleString() : (isMe ? "Read by recipient" : "Read")}</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-muted-foreground">Message ID</span>
              <span className="font-mono text-[10px] text-muted-foreground truncate max-w-[200px]">{message.uuid}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function MessageDateSeparator({ date }: { date: string }) {
  return (
    <div className="relative my-4 flex items-center justify-center">
      <div className="absolute inset-0 flex items-center" aria-hidden="true">
        <div className="w-full border-t border-border/60" />
      </div>
      <div className="relative flex items-center gap-1.5 rounded-full border border-border/70 bg-background px-3 py-1 text-xs font-medium text-muted-foreground shadow-2xs">
        <Calendar className="size-3 text-muted-foreground" />
        <span>{formatDateSeparator(date)}</span>
      </div>
    </div>
  );
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

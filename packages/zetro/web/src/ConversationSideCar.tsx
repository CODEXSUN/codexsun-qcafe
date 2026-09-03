import { useState } from "react";
import { ChevronDown, Plus, Search } from "lucide-react";
import { Button } from "@codexsun/ui/components/button";
import { conversationGroup, type Conversation } from "./conversations.js";

export function ConversationSideCar({ conversations, activeId, disabled, onSelect, onNew }: { conversations: Conversation[]; activeId: string; disabled: boolean; onSelect: (item: Conversation) => void; onNew: () => void }) {
  const [search, setSearch] = useState("");
  const matching = conversations.filter((item) => `${item.title} ${item.exchanges.map((entry) => entry.prompt).join(" ")}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return <section aria-label="Zetro chats" className="flex h-full min-h-0 flex-col">
    <label className="flex shrink-0 items-center gap-2 border-b border-border px-2 pb-3"><Search aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" /><input aria-label="Search chats" placeholder="Search chats…" value={search} onChange={(event) => setSearch(event.target.value)} className="min-w-0 flex-1 rounded bg-transparent py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" /></label>
    <div className="min-h-0 flex-1 overflow-y-auto py-3">{["Today", "Yesterday", "Previous 7 days", "Older"].map((group) => {
      const items = matching.filter((item) => conversationGroup(item.updatedAt) === group);
      return items.length > 0 && <details key={group} open className="group mb-3"><summary className="flex cursor-pointer list-none items-center justify-between rounded px-2 py-2 text-xs font-medium text-muted-foreground hover:bg-accent [&::-webkit-details-marker]:hidden">{group}<ChevronDown className="size-3 transition-transform group-open:rotate-180" /></summary><div className="space-y-1">{items.map((item) => <button key={item.id} type="button" disabled={disabled} aria-current={item.id === activeId ? "true" : undefined} title={item.title} onClick={() => onSelect(item)} className={`w-full cursor-pointer truncate rounded-lg px-3 py-3 text-left text-sm outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait ${item.id === activeId ? "bg-accent font-medium" : ""}`}>{item.title}</button>)}</div></details>;
    })}{!matching.length && <p className="px-3 py-5 text-sm text-muted-foreground">{search ? "No matching chats." : "Your chats will appear here."}</p>}</div>
    <div className="shrink-0 border-t border-border pt-3"><Button onClick={onNew} disabled={disabled} className="w-full gap-2"><Plus className="size-4" />New Chat</Button><p className="mt-2 text-center text-xs text-muted-foreground">Saved in this browser</p></div>
  </section>;
}

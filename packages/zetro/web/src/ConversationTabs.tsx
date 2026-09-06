import { Bot, Loader2, Plus, X } from "lucide-react";
import { Button } from "@codexsun/ui/components/button";
import type { Conversation } from "./conversations.js";

type Props = {
  activeId: string;
  conversations: Conversation[];
  openIds: string[];
  runningIds: ReadonlySet<string>;
  onClose: (id: string) => void;
  onNew: () => void;
  onSelect: (id: string) => void;
};

export function ConversationTabs({ activeId, conversations, openIds, runningIds, onClose, onNew, onSelect }: Props) {
  return <nav aria-label="Open Zetro chats" className="flex h-10 shrink-0 items-stretch border-b border-border bg-muted/20">
    <div className="flex min-w-0 flex-1 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {openIds.map((id) => {
        const conversation = conversations.find((item) => item.id === id);
        const title = conversation?.title || "New chat";
        const running = runningIds.has(id);
        const active = id === activeId;
        return <div key={id} className={`group flex min-w-36 max-w-56 shrink-0 items-center border-r border-border ${active ? "bg-background" : "hover:bg-accent"}`}>
          <button
            type="button"
            aria-current={active ? "page" : undefined}
            className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 px-3 py-2 text-left text-xs outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            onClick={() => onSelect(id)}
            title={title}
          >
            {running ? <Loader2 className="size-3.5 shrink-0 animate-spin text-primary" aria-label="Response running" /> : <Bot className="size-3.5 shrink-0 text-muted-foreground" />}
            <span className="truncate font-medium">{title}</span>
          </button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="mr-1 size-6 shrink-0 cursor-pointer opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
            aria-label={`Close ${title}`}
            title="Close tab"
            onClick={() => onClose(id)}
          >
            <X className="size-3.5" />
          </Button>
        </div>;
      })}
    </div>
    <Button type="button" variant="ghost" size="icon" className="h-full w-10 shrink-0 cursor-pointer rounded-none border-l border-border" aria-label="Open new chat tab" title="New chat tab" onClick={onNew}>
      <Plus className="size-4" />
    </Button>
  </nav>;
}

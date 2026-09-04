import { useState } from "react";
import { Archive, Check, ChevronDown, Copy, Folder, FolderKanban, FolderPlus, MessageSquare, MoreHorizontal, Pencil, Pin, Plus, Search, Trash2, X } from "lucide-react";
import { Button } from "@codexsun/ui/components/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@codexsun/ui/components/ui/dialog";
import { Input } from "@codexsun/ui/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@codexsun/ui/components/ui/popover";
import { MdiTopologyRegion, type MdiTopologyAdapter } from "@codexsun/ui-desk";
import { type Conversation, type Project } from "./conversations.js";

export function ConversationSideCar({
  conversations,
  projects = [],
  activeId,
  disabled,
  onSelect,
  onNew,
  topology,
  onPin,
  onRename,
  onArchive,
  onDelete,
  onCopy,
  onAssignProject,
  onCreateProject,
}: {
  conversations: Conversation[];
  projects?: Project[];
  activeId: string;
  disabled: boolean;
  onSelect: (item: Conversation) => void;
  onNew: () => void;
  topology?: MdiTopologyAdapter;
  onPin?: (id: string) => void;
  onRename?: (id: string, newTitle: string) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
  onCopy?: (item: Conversation) => void;
  onAssignProject?: (conversationId: string, projectId?: string) => void;
  onCreateProject?: (name: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const matching = conversations
    .filter((item) => `${item.title} ${item.exchanges.map((entry) => entry.prompt).join(" ")}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));

  function renderItem(item: Conversation) {
    if (editingId === item.id) {
      return (
        <div key={item.id} className="flex items-center gap-1 rounded-lg bg-accent/60 p-1">
          <input
            autoFocus
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (editTitle.trim()) onRename?.(item.id, editTitle.trim());
                setEditingId(null);
              } else if (e.key === "Escape") {
                setEditingId(null);
              }
            }}
            className="min-w-0 flex-1 rounded-md border border-input bg-background px-2 py-1 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-6 cursor-pointer text-emerald-600 hover:bg-emerald-500/10"
            title="Save title"
            aria-label="Save title"
            onClick={() => {
              if (editTitle.trim()) onRename?.(item.id, editTitle.trim());
              setEditingId(null);
            }}
          >
            <Check className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-6 cursor-pointer text-muted-foreground hover:bg-accent"
            title="Cancel"
            aria-label="Cancel"
            onClick={() => setEditingId(null)}
          >
            <X className="size-3.5" />
          </Button>
        </div>
      );
    }

    return (
      <div
        key={item.id}
        className={`group relative flex items-center justify-between rounded-lg transition-colors hover:bg-accent ${
          item.id === activeId ? "bg-accent font-medium" : ""
        }`}
      >
        <button
          type="button"
          disabled={disabled}
          aria-current={item.id === activeId ? "true" : undefined}
          title={item.title}
          onClick={() => onSelect(item)}
          className="min-w-0 flex-1 cursor-pointer truncate rounded-lg py-2.5 pl-3 pr-2 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait"
        >
          <span className="flex items-center gap-1.5 truncate">
            {item.pinned && <Pin className="size-3 shrink-0 fill-primary text-primary" />}
            {item.archived && <Archive className="size-3 shrink-0 text-muted-foreground" />}
            <span className="truncate">{item.title}</span>
          </span>
        </button>

        <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0 pr-1">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 cursor-pointer text-muted-foreground hover:text-foreground"
                aria-label="Conversation options"
                title="More options"
              >
                <MoreHorizontal className="size-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-36 p-1 rounded-xl border-border shadow-md">
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-start gap-2 h-8 px-2 text-xs cursor-pointer"
                onClick={(e) => { e.stopPropagation(); onPin?.(item.id); }}
              >
                <Pin className={`size-3.5 ${item.pinned ? "fill-current text-primary" : ""}`} />
                {item.pinned ? "Unpin" : "Pin"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-start gap-2 h-8 px-2 text-xs cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingId(item.id);
                  setEditTitle(item.title);
                }}
              >
                <Pencil className="size-3.5" />
                Rename
              </Button>
              {projects && projects.length > 0 && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full justify-start gap-2 h-8 px-2 text-xs cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <FolderKanban className="size-3.5" />
                      Project...
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent side="right" align="start" className="w-44 p-1 rounded-xl border-border shadow-md">
                    <p className="px-2 py-1 text-[11px] font-semibold text-muted-foreground">Assign Project</p>
                    <Button
                      type="button"
                      variant="ghost"
                      className={`w-full justify-start gap-2 h-7 px-2 text-xs cursor-pointer ${!item.projectId ? "text-primary font-medium" : ""}`}
                      onClick={(e) => { e.stopPropagation(); onAssignProject?.(item.id, undefined); }}
                    >
                      None (Conversations)
                    </Button>
                    {projects.map((p) => (
                      <Button
                        key={p.id}
                        type="button"
                        variant="ghost"
                        className={`w-full justify-start gap-2 h-7 px-2 text-xs cursor-pointer ${item.projectId === p.id ? "text-primary font-medium" : ""}`}
                        onClick={(e) => { e.stopPropagation(); onAssignProject?.(item.id, p.id); }}
                      >
                        <Folder className="size-3 text-muted-foreground shrink-0" />
                        <span className="truncate">{p.name}</span>
                      </Button>
                    ))}
                  </PopoverContent>
                </Popover>
              )}
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-start gap-2 h-8 px-2 text-xs cursor-pointer"
                onClick={(e) => { e.stopPropagation(); onCopy?.(item); }}
              >
                <Copy className="size-3.5" />
                Copy
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-start gap-2 h-8 px-2 text-xs cursor-pointer"
                onClick={(e) => { e.stopPropagation(); onArchive?.(item.id); }}
              >
                <Archive className="size-3.5" />
                {item.archived ? "Unarchive" : "Archive"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-start gap-2 h-8 px-2 text-xs cursor-pointer text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={(e) => { e.stopPropagation(); onDelete?.(item.id); }}
              >
                <Trash2 className="size-3.5" />
                Delete
              </Button>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    );
  }

  const pinnedItems = matching.filter((item) => item.pinned && !item.archived);
  const unassignedItems = matching.filter((item) => !item.pinned && !item.archived && !item.projectId);
  const archivedItems = matching.filter((item) => item.archived);

  return (
    <MdiTopologyRegion id="z2.1" topology={topology} className="flex h-full min-h-0 flex-col">
      <MdiTopologyRegion id="z2.1.1" topology={topology} className="shrink-0 -mx-3 -mt-3 border-b border-border">
        <div className="relative w-full">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            aria-label="Search chats"
            placeholder="Search chats…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-11 w-full rounded-none border-0 bg-transparent py-2 pl-9 pr-8 text-sm outline-none transition-colors placeholder:text-muted-foreground hover:bg-muted/20 focus:bg-background focus:ring-0 focus-visible:ring-0"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </MdiTopologyRegion>
      <MdiTopologyRegion id="z2.1.2" topology={topology} className="min-h-0 flex-1 overflow-y-auto py-3">
        {pinnedItems.length > 0 && (
          <details open className="group mb-3">
            <summary className="flex cursor-pointer list-none items-center justify-between rounded px-2 py-2 text-xs font-medium text-primary hover:bg-accent [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-1.5">
                <Pin className="size-3 fill-current" />
                Pinned ({pinnedItems.length})
              </span>
              <ChevronDown className="size-3 transition-transform group-open:rotate-180" />
            </summary>
            <div className="max-h-[205px] overflow-y-auto space-y-1 overscroll-contain">
              {pinnedItems.map(renderItem)}
            </div>
          </details>
        )}

        {projects.length > 0 && (
          <details open className="group mb-3">
            <summary className="flex cursor-pointer list-none items-center justify-between rounded px-2 py-2 text-xs font-medium text-muted-foreground hover:bg-accent [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-1.5">
                <FolderKanban className="size-3.5 text-primary" />
                Projects
              </span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-5 cursor-pointer p-0 text-muted-foreground hover:text-foreground"
                  title="New Project"
                  aria-label="New Project"
                  onClick={(e) => {
                    e.stopPropagation();
                    setProjectName("");
                    setProjectDialogOpen(true);
                  }}
                >
                  <Plus className="size-3" />
                </Button>
                <ChevronDown className="size-3 transition-transform group-open:rotate-180" />
              </div>
            </summary>
            <div className="space-y-1.5 pt-1">
              {projects.map((proj) => {
                const projChats = matching.filter((item) => !item.pinned && !item.archived && item.projectId === proj.id);
                return (
                  <details key={proj.id} open className="group/proj rounded-lg border border-border/40 bg-card/20 overflow-hidden">
                    <summary className="flex cursor-pointer list-none items-center justify-between px-2.5 py-1.5 text-xs font-medium text-foreground/90 hover:bg-accent/60 [&::-webkit-details-marker]:hidden">
                      <span className="flex items-center gap-1.5 truncate">
                        <Folder className="size-3 text-primary shrink-0" />
                        <span className="truncate">{proj.name}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">({projChats.length})</span>
                      </span>
                      <ChevronDown className="size-3 text-muted-foreground transition-transform group-open/proj:rotate-180 shrink-0" />
                    </summary>
                    <div className="max-h-[205px] overflow-y-auto space-y-1 p-1 overscroll-contain">
                      {projChats.length > 0 ? (
                        projChats.map(renderItem)
                      ) : (
                        <p className="px-2 py-2 text-[11px] text-muted-foreground italic">No chats in this project.</p>
                      )}
                    </div>
                  </details>
                );
              })}
            </div>
          </details>
        )}

        {projects.length > 0 && (unassignedItems.length > 0 || archivedItems.length > 0) && (
          <div className="my-3.5 border-t border-border/70" />
        )}

        {unassignedItems.length > 0 && (
          <details open className="group mb-3">
            <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg bg-muted/60 px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted border border-border/40 transition-colors [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-1.5">
                <MessageSquare className="size-3.5 text-primary" />
                <span>Conversations</span>
                <span className="rounded-full bg-background/80 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground border border-border/30">
                  {unassignedItems.length}
                </span>
              </span>
              <ChevronDown className="size-3 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="max-h-[205px] overflow-y-auto space-y-1 pt-1.5 overscroll-contain">
              {unassignedItems.map(renderItem)}
            </div>
          </details>
        )}

        {archivedItems.length > 0 && (
          <details className="group mb-3">
            <summary className="flex cursor-pointer list-none items-center justify-between rounded px-2 py-2 text-xs font-medium text-muted-foreground hover:bg-accent [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-1.5">
                <Archive className="size-3" />
                Archived ({archivedItems.length})
              </span>
              <ChevronDown className="size-3 transition-transform group-open:rotate-180" />
            </summary>
            <div className="max-h-[205px] overflow-y-auto space-y-1 overscroll-contain">
              {archivedItems.map(renderItem)}
            </div>
          </details>
        )}

        {!matching.length && (
          <p className="px-3 py-5 text-sm text-muted-foreground">{search ? "No matching chats." : "Your chats will appear here."}</p>
        )}
      </MdiTopologyRegion>
      <MdiTopologyRegion id="z2.1.3" topology={topology} className="shrink-0 border-t border-border pt-3">
        <Button onClick={onNew} disabled={disabled} className="w-full gap-2 cursor-pointer">
          <Plus className="size-4" />
          New Chat
        </Button>
      </MdiTopologyRegion>

      <MdiTopologyRegion id="z2.1.4" topology={topology}><Dialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <FolderPlus className="size-4 text-primary" />
              Create Project
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Group conversations into a dedicated project workspace.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const trimmed = projectName.trim();
              if (trimmed) {
                onCreateProject?.(trimmed);
                setProjectName("");
                setProjectDialogOpen(false);
              }
            }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1.5">
              <label htmlFor="sidecar-project-name" className="text-xs font-medium text-foreground">
                Project Name
              </label>
              <Input
                id="sidecar-project-name"
                placeholder="e.g. Core Platform, Agent Flow..."
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                autoFocus
                className="h-9 text-sm"
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setProjectDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!projectName.trim()}
              >
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog></MdiTopologyRegion>
    </MdiTopologyRegion>
  );
}

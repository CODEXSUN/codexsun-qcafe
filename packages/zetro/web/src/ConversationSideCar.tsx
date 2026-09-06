import { useEffect, useState } from "react";
import { Archive, Boxes, Check, ChevronDown, Copy, FileSearch, Folder, FolderKanban, FolderOpen, FolderPlus, Loader2, MessageSquare, MoreHorizontal, Pencil, Pin, Plus, Search, Trash2, X } from "lucide-react";
import { Button } from "@codexsun/ui/components/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@codexsun/ui/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@codexsun/ui/components/ui/alert-dialog";
import { Input } from "@codexsun/ui/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@codexsun/ui/components/ui/popover";
import { MdiTopologyRegion, type MdiTopologyAdapter } from "@codexsun/ui-desk";
import { useQuery } from "@tanstack/react-query";
import { type Conversation, type Project } from "./conversations.js";
import { createWorkspaceFolder, getWorkspaceFolders } from "./workspace-api.js";
import { isDesktopZetro, pickDesktopProjectFolder } from "./desktop-bridge.js";
import { zetroNotifications } from "./notifications.js";

export function ConversationSideCar({
  conversations,
  projects = [],
  activeId,
  runningIds,
  disabled = false,
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
  onEditProject,
  onPinProject,
  onArchiveProjectChats,
  onRemoveProject,
}: {
  conversations: Conversation[];
  projects?: Project[];
  activeId: string;
  runningIds?: ReadonlySet<string>;
  disabled?: boolean;
  onSelect: (item: Conversation) => void;
  onNew: (projectId?: string) => void;
  topology?: MdiTopologyAdapter;
  onPin?: (id: string) => void;
  onRename?: (id: string, newTitle: string) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
  onCopy?: (item: Conversation) => void;
  onAssignProject?: (conversationId: string, projectId?: string) => void;
  onCreateProject?: (name: string, localFolder: string, kind?: "project" | "addon") => void;
  onEditProject?: (id: string, name: string, localFolder: string) => void;
  onPinProject?: (id: string) => void;
  onArchiveProjectChats?: (id: string) => void;
  onRemoveProject?: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectFolder, setProjectFolder] = useState(".");
  const [folderBrowserOpen, setFolderBrowserOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingKind, setEditingKind] = useState<"project" | "addon">("project");
  const [folderConfirmationOpen, setFolderConfirmationOpen] = useState(false);
  const [pendingProjectName, setPendingProjectName] = useState("");
  const [folderActionBusy, setFolderActionBusy] = useState(false);
  const [folderActionError, setFolderActionError] = useState("");
  const [exploringProjectId, setExploringProjectId] = useState<string | null>(null);
  const desktop = isDesktopZetro();
  const folders = useQuery({
    queryKey: ["zetro-workspace-folders"],
    queryFn: getWorkspaceFolders,
    retry: 5,
    retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 5_000),
    enabled: !desktop,
  });
  useEffect(() => {
    const refresh = () => void folders.refetch();
    window.addEventListener("zetro-settings-updated", refresh);
    return () => window.removeEventListener("zetro-settings-updated", refresh);
  }, [folders.refetch]);
  const matching = conversations
    .filter((item) => `${item.title} ${item.exchanges.map((entry) => entry.prompt).join(" ")}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (a.updatedAt ?? "").localeCompare(b.updatedAt ?? ""));

  function saveProject(name: string, folder: string) {
    if (editingProjectId) onEditProject?.(editingProjectId, name, folder);
    else onCreateProject?.(name, folder, editingKind);
    setProjectName("");
    setProjectFolder(".");
    setEditingProjectId(null);
    setProjectDialogOpen(false);
  }

  async function createFolderAndSave() {
    setFolderActionBusy(true);
    setFolderActionError("");
    try {
      const created = await createWorkspaceFolder(projectFolder);
      setProjectFolder(created.folder);
      await folders.refetch();
      setFolderConfirmationOpen(false);
      saveProject(pendingProjectName, created.folder);
    } catch (cause) {
      setFolderActionError(zetroNotifications.error(cause, "The folder could not be created."));
    } finally {
      setFolderActionBusy(false);
    }
  }

  async function chooseDesktopProjectFolder() {
    setFolderActionError("");
    try {
      const selected = await pickDesktopProjectFolder();
      if (selected) setProjectFolder(selected.folder);
    } catch (cause) {
      setFolderActionError(zetroNotifications.error(cause, "The Windows folder picker could not be opened."));
    }
  }

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
            {runningIds?.has(item.id) && (
              <span
                className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 shrink-0"
                title="Responding…"
                aria-label="Agent responding"
              >
                <span className="size-1 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                <span className="size-1 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                <span className="size-1 rounded-full bg-primary animate-bounce" />
              </span>
            )}
          </span>
        </button>

        <div className="flex shrink-0 gap-0.5 pr-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <Button type="button" variant="ghost" size="icon" className="size-7 cursor-pointer" aria-label={`Rename ${item.title}`} title="Rename" onClick={() => { setEditingId(item.id); setEditTitle(item.title); }}><Pencil className="size-3.5" /></Button>
          <Button type="button" variant="ghost" size="icon" className="size-7 cursor-pointer" aria-label={`Archive ${item.title}`} title="Archive" onClick={() => onArchive?.(item.id)}><Archive className="size-3.5" /></Button>
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
                      Group...
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent side="right" align="start" className="w-44 p-1 rounded-xl border-border shadow-md">
                    <p className="px-2 py-1 text-[11px] font-semibold text-muted-foreground">Assign group</p>
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
  const projectGroups = projects.filter((project) => project.kind !== "addon");
  const addonGroups = projects.filter((project) => project.kind === "addon");

  const isProjectRunning = (projId: string) =>
    Boolean(runningIds && conversations.some((c) => c.projectId === projId && runningIds.has(c.id)));

  const hasUnassignedRunning = Boolean(
    runningIds && conversations.some((c) => !c.projectId && runningIds.has(c.id))
  );
  const hasAnyProjectRunning = Boolean(
    runningIds &&
      conversations.some(
        (c) =>
          c.projectId &&
          runningIds.has(c.id) &&
          projects.some((p) => p.id === c.projectId && p.kind !== "addon")
      )
  );
  const hasAnyAddonRunning = Boolean(
    runningIds &&
      conversations.some(
        (c) =>
          c.projectId &&
          runningIds.has(c.id) &&
          projects.some((p) => p.id === c.projectId && p.kind === "addon")
      )
  );

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

        <details open className="group mb-3">
            <summary className="flex cursor-pointer list-none items-center justify-between rounded px-2 py-2 text-xs font-medium text-muted-foreground hover:bg-accent [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-1.5">
                <FolderKanban className="size-3.5 text-primary" />
                Projects
                {hasAnyProjectRunning && (
                  <span title="Tasks running in projects" className="inline-flex items-center">
                    <Loader2 className="size-3 shrink-0 animate-spin text-primary" aria-label="Tasks running in projects" />
                  </span>
                )}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-5 cursor-pointer p-0 text-muted-foreground hover:text-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"
                  title="New Project"
                  aria-label="New Project"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingProjectId(null);
                    setEditingKind("project");
                    setProjectName("");
                    setProjectFolder(".");
                    setProjectDialogOpen(true);
                  }}
                >
                  <Plus className="size-3" />
                </Button>
                <ChevronDown className="size-3 transition-transform group-open:rotate-180" />
              </div>
            </summary>
            <div className="space-y-1.5 pt-1">
              {projectGroups.filter((project) => !exploringProjectId || project.id === exploringProjectId).sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned))).map((proj) => {
                const projChats = matching.filter((item) => !item.pinned && !item.archived && item.projectId === proj.id);
                return (
                  <details key={proj.id} open className="group/proj rounded-lg border border-border/40 bg-card/20 overflow-hidden">
                    <summary className="flex cursor-pointer list-none items-center justify-between px-2.5 py-1.5 text-xs font-medium text-foreground/90 hover:bg-accent/60 [&::-webkit-details-marker]:hidden">
                      <span className="flex items-center gap-1.5 truncate">
                        <Folder className="size-3 text-primary shrink-0" />
                        {proj.pinned && <Pin className="size-3 fill-current text-primary" />}
                        <span className="truncate">{proj.name}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">({projChats.length})</span>
                        {isProjectRunning(proj.id) && (
                          <span title="Running tasks in project" className="inline-flex items-center">
                            <Loader2 className="size-3 shrink-0 animate-spin text-primary" aria-label="Running tasks in project" />
                          </span>
                        )}
                      </span>
                      <span className="flex items-center gap-0.5" onClick={(event) => event.stopPropagation()}>
                        <span className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover/proj:opacity-100 focus-within:opacity-100 has-[[data-state=open]]:opacity-100">
                          <Button type="button" variant="ghost" size="icon" className="size-6 cursor-pointer" aria-label={`New chat in ${proj.name}`} title="New chat" onClick={() => onNew(proj.id)}><Plus className="size-3.5" /></Button>
                          <Popover>
                            <PopoverTrigger asChild><Button type="button" variant="ghost" size="icon" className="size-6 cursor-pointer" aria-label={`${proj.name} options`} title="Project options"><MoreHorizontal className="size-3.5" /></Button></PopoverTrigger>
                            <PopoverContent align="end" className="w-48 p-1">
                              <ProjectAction icon={Pin} label={proj.pinned ? "Unpin" : "Pin"} onClick={() => onPinProject?.(proj.id)} />
                              <ProjectAction icon={Pencil} label="Edit" onClick={() => { setEditingProjectId(proj.id); setEditingKind("project"); setProjectName(proj.name); setProjectFolder(proj.localFolder ?? "."); setProjectDialogOpen(true); }} />
                              <ProjectAction icon={FolderOpen} label={exploringProjectId === proj.id ? "Show all projects" : "Open in Explore"} onClick={() => setExploringProjectId((current) => current === proj.id ? null : proj.id)} />
                              <ProjectAction icon={Archive} label="Archive Chats" onClick={() => onArchiveProjectChats?.(proj.id)} />
                              <ProjectAction destructive icon={Trash2} label="Remove project" onClick={() => { onRemoveProject?.(proj.id); setExploringProjectId(null); }} />
                            </PopoverContent>
                          </Popover>
                        </span>
                        <ChevronDown className="size-3 text-muted-foreground transition-transform group-open/proj:rotate-180 shrink-0" />
                      </span>
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
              {projectGroups.length === 0 && <p className="px-2 py-2 text-[11px] text-muted-foreground">No projects yet.</p>}
            </div>
          </details>

        <details open className="group mb-3">
          <summary className="flex cursor-pointer list-none items-center justify-between rounded px-2 py-2 text-xs font-medium text-muted-foreground hover:bg-accent [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-1.5">
              <Boxes className="size-3.5 text-primary" />
              Add-ons
              {hasAnyAddonRunning && (
                <span title="Tasks running in add-ons" className="inline-flex items-center">
                  <Loader2 className="size-3 shrink-0 animate-spin text-primary" aria-label="Tasks running in add-ons" />
                </span>
              )}
            </span>
            <div className="flex items-center gap-1">
              <Button type="button" variant="ghost" size="icon" className="size-5 cursor-pointer p-0 text-muted-foreground hover:text-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100" title="New Add-on" aria-label="New Add-on" onClick={(event) => { event.stopPropagation(); setEditingProjectId(null); setEditingKind("addon"); setProjectName(""); setProjectFolder("."); setProjectDialogOpen(true); }}><Plus className="size-3" /></Button>
              <ChevronDown className="size-3 transition-transform group-open:rotate-180" />
            </div>
          </summary>
          <div className="space-y-1.5 pt-1">
            {addonGroups.sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned))).map((addon) => {
              const addonChats = matching.filter((item) => !item.pinned && !item.archived && item.projectId === addon.id);
              return <details key={addon.id} open className="group/addon overflow-hidden rounded-lg border border-border/40 bg-card/20">
                <summary className="flex cursor-pointer list-none items-center justify-between px-2.5 py-1.5 text-xs font-medium text-foreground/90 hover:bg-accent/60 [&::-webkit-details-marker]:hidden">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <Boxes className="size-3 shrink-0 text-primary" />
                    {addon.pinned && <Pin className="size-3 shrink-0 fill-current text-primary" />}
                    <span className="truncate">{addon.name}</span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">({addonChats.length})</span>
                    {isProjectRunning(addon.id) && (
                      <span title="Running tasks in add-on" className="inline-flex items-center">
                        <Loader2 className="size-3 shrink-0 animate-spin text-primary" aria-label="Running tasks in add-on" />
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-0.5" onClick={(event) => event.stopPropagation()}>
                    <span className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover/addon:opacity-100 focus-within:opacity-100 has-[[data-state=open]]:opacity-100">
                      <Button type="button" variant="ghost" size="icon" className="size-6 cursor-pointer" aria-label={`New chat in ${addon.name}`} title="New chat" onClick={() => onNew(addon.id)}><Plus className="size-3.5" /></Button>
                      <Popover><PopoverTrigger asChild><Button type="button" variant="ghost" size="icon" className="size-6 cursor-pointer" aria-label={`${addon.name} options`} title="Add-on options"><MoreHorizontal className="size-3.5" /></Button></PopoverTrigger><PopoverContent align="end" className="w-48 p-1">
                        <ProjectAction icon={Pin} label={addon.pinned ? "Unpin" : "Pin"} onClick={() => onPinProject?.(addon.id)} />
                        <ProjectAction icon={Pencil} label="Edit" onClick={() => { setEditingProjectId(addon.id); setEditingKind("addon"); setProjectName(addon.name); setProjectFolder(addon.localFolder ?? "."); setProjectDialogOpen(true); }} />
                        <ProjectAction icon={Archive} label="Archive Chats" onClick={() => onArchiveProjectChats?.(addon.id)} />
                        <ProjectAction destructive icon={Trash2} label="Remove add-on" onClick={() => onRemoveProject?.(addon.id)} />
                      </PopoverContent></Popover>
                    </span>
                    <ChevronDown className="size-3 shrink-0 text-muted-foreground transition-transform group-open/addon:rotate-180" />
                  </span>
                </summary>
                <div className="max-h-[205px] space-y-1 overflow-y-auto p-1 overscroll-contain">{addonChats.length ? addonChats.map(renderItem) : <p className="px-2 py-2 text-[11px] italic text-muted-foreground">No chats in this add-on.</p>}</div>
              </details>;
            })}
            {addonGroups.length === 0 && <p className="px-2 py-2 text-[11px] text-muted-foreground">No add-ons yet.</p>}
          </div>
        </details>

        <div className="my-3.5 border-t border-border/70" />

        <details open className="group mb-3">
          <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg bg-muted/60 px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted border border-border/40 transition-colors [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-1.5">
              <MessageSquare className="size-3.5 text-primary" />
              <span>Conversations</span>
              <span className="rounded-full bg-background/80 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground border border-border/30">
                {unassignedItems.length}
              </span>
              {hasUnassignedRunning && (
                <span title="Running tasks in conversations" className="inline-flex items-center">
                  <Loader2 className="size-3 shrink-0 animate-spin text-primary" aria-label="Running tasks in conversations" />
                </span>
              )}
            </span>
            <ChevronDown className="size-3 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
          <div className="max-h-[205px] overflow-y-auto space-y-1 pt-1.5 overscroll-contain">
            {unassignedItems.length > 0
              ? unassignedItems.map(renderItem)
              : <p className="px-2 py-2 text-[11px] text-muted-foreground">{search ? "No matching conversations." : "New chats without a project appear here."}</p>}
          </div>
        </details>

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

        {!matching.length && projects.length === 0 && (
          <p className="px-3 py-5 text-sm text-muted-foreground">{search ? "No matching chats." : "Your chats will appear here."}</p>
        )}
      </MdiTopologyRegion>
      <MdiTopologyRegion id="z2.1.3" topology={topology} className="shrink-0 border-t border-border pt-3">
        <Button asChild variant="ghost" className="mb-2 w-full cursor-pointer justify-start gap-2"><a href="/?app=zetro&page=review"><FileSearch className="size-4" />Review Library</a></Button>
        <Button onClick={() => onNew()} disabled={disabled} className="w-full gap-2 cursor-pointer">
          <Plus className="size-4" />
          New Chat
        </Button>
      </MdiTopologyRegion>

      <MdiTopologyRegion id="z2.1.4" topology={topology}><Dialog open={projectDialogOpen} onOpenChange={(open) => { setProjectDialogOpen(open); if (!open) setEditingProjectId(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <FolderPlus className="size-4 text-primary" />
              {editingProjectId ? `Edit ${editingKind === "addon" ? "Add-on" : "Project"}` : `Create ${editingKind === "addon" ? "Add-on" : "Project"}`}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {editingKind === "addon" ? "Group conversations for a reusable Zetro add-on." : "Group conversations into a dedicated project workspace."}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const trimmed = projectName.trim();
              const folder = normalizeFolderInput(projectFolder);
              const validationError = validateFolderInput(folder);
              if (!trimmed || validationError) { setFolderActionError(validationError); return; }
              setProjectFolder(folder);
              setFolderActionError("");
              if (desktop || (folders.data?.folders ?? []).includes(folder)) saveProject(trimmed, folder);
              else { setPendingProjectName(trimmed); setFolderConfirmationOpen(true); }
            }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1.5">
              <label htmlFor="sidecar-project-name" className="text-xs font-medium text-foreground">
                {editingKind === "addon" ? "Add-on name" : "Project name"}
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
            <div className="space-y-1.5">
              <label id="sidecar-project-folder-label" className="text-xs font-medium text-foreground">Local folder</label>
              <div className="flex h-9 items-stretch rounded-md border border-input bg-background focus-within:ring-1 focus-within:ring-ring">
                <div className="flex min-w-0 flex-1 items-center gap-2 px-3">
                  <Folder className="size-4 shrink-0 text-muted-foreground" />
                  <input
                    aria-labelledby="sidecar-project-folder-label"
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    id="sidecar-project-folder"
                    onChange={(event) => { setProjectFolder(event.target.value); setFolderActionError(""); }}
                    placeholder="apps/my-agent"
                    spellCheck={false}
                    value={projectFolder}
                  />
                </div>
                {desktop ? <Button aria-label="Choose a project folder in Windows" className="h-full w-10 shrink-0 rounded-l-none border-0 border-l border-input" size="icon" type="button" variant="ghost" onClick={() => void chooseDesktopProjectFolder()}>
                  <FolderOpen className="size-4" />
                </Button> : <Popover open={folderBrowserOpen} onOpenChange={setFolderBrowserOpen}>
                  <PopoverTrigger asChild>
                    <Button aria-label="Browse local folders" className="h-full w-10 shrink-0 rounded-l-none border-0 border-l border-input" disabled={folders.isLoading || Boolean(folders.error)} size="icon" type="button" variant="ghost">
                      <FolderOpen className="size-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-80 p-0">
                    <div className="border-b border-border px-3 py-2.5">
                      <p className="text-sm font-medium">Choose project folder</p>
                      <p className="truncate text-xs text-muted-foreground" title={folders.data?.root}>{folders.data?.root}</p>
                    </div>
                    <div className="max-h-64 overflow-y-auto p-1.5" role="listbox" aria-label="Available local folders">
                      {(folders.data?.folders ?? [projectFolder]).map((folder) => {
                        const selected = folder === projectFolder;
                        return <button
                          aria-selected={selected}
                          className={`flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm hover:bg-accent ${selected ? "bg-accent text-accent-foreground" : ""}`}
                          key={folder}
                          onClick={() => { setProjectFolder(folder); setFolderBrowserOpen(false); }}
                          role="option"
                          type="button"
                        >
                          {folder === "." ? <FolderKanban className="size-4 shrink-0" /> : <Folder className="size-4 shrink-0 text-muted-foreground" />}
                          <span className="min-w-0 flex-1 truncate">{folder === "." ? "Repository root" : folder}</span>
                          {selected && <Check className="size-4 shrink-0" />}
                        </button>;
                      })}
                    </div>
                  </PopoverContent>
                </Popover>}
              </div>
              <p className="truncate text-[11px] text-muted-foreground" title={desktop ? projectFolder : folders.data?.root}>{desktop ? "Choose an existing folder. Windows opens at the repository apps folder." : folders.isLoading ? "Finding local folders…" : `${folders.data?.root}${projectFolder === "." ? "" : ` / ${projectFolder}`}`}</p>
              {folderActionError && <p className="text-xs text-destructive" role="alert">{folderActionError}</p>}
              {!desktop && folders.error && (
                <div className="flex items-center justify-between gap-2 text-xs text-destructive">
                  <span>Unable to load local folders.</span>
                  <Button type="button" variant="ghost" size="sm" className="h-7 cursor-pointer px-2" onClick={() => void folders.refetch()}>
                    Retry
                  </Button>
                </div>
              )}
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => { setProjectDialogOpen(false); setEditingProjectId(null); }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!projectName.trim() || !projectFolder.trim() || (!desktop && (folders.isLoading || Boolean(folders.error)))}
              >
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={folderConfirmationOpen} onOpenChange={(open) => { if (!folderActionBusy) setFolderConfirmationOpen(open); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create local folder?</AlertDialogTitle>
            <AlertDialogDescription>The folder <span className="font-mono text-foreground">{projectFolder}</span> does not exist. Zetro needs your permission to create it inside the configured repository root.</AlertDialogDescription>
          </AlertDialogHeader>
          {folderActionError && <p className="text-sm text-destructive" role="alert">{folderActionError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={folderActionBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={folderActionBusy} onClick={(event) => { event.preventDefault(); void createFolderAndSave(); }}>{folderActionBusy ? "Creating…" : "Create folder and save"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog></MdiTopologyRegion>
    </MdiTopologyRegion>
  );
}

function ProjectAction({ destructive = false, icon: Icon, label, onClick }: { destructive?: boolean; icon: typeof Pin; label: string; onClick: () => void }) {
  return <Button type="button" variant="ghost" className={`h-8 w-full cursor-pointer justify-start gap-2 px-2 text-xs ${destructive ? "text-destructive hover:bg-destructive/10 hover:text-destructive" : ""}`} onClick={onClick}><Icon className="size-3.5" />{label}</Button>;
}

function normalizeFolderInput(value: string) {
  const folder = value.trim().replaceAll("\\", "/").replace(/^\/+|\/+$/gu, "");
  return folder || ".";
}

function validateFolderInput(folder: string) {
  if (folder === ".") return "";
  if (/^[A-Za-z]:/u.test(folder) || folder.split("/").some((segment) => !segment || segment === "." || segment === ".." || /[<>:"|?*\u0000-\u001f]/u.test(segment))) return "Use a repository-relative folder such as apps/my-agent.";
  return "";
}

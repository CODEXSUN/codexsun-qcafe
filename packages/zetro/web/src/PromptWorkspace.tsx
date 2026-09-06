import { platformFetch } from "@codexsun/platform-host-contracts";
import { AttachmentControls, AttachmentPreviews } from "./AttachmentControls.js";
import type { PromptAttachment } from "@codexsun/zetro-api/contracts";
import { createPortal } from "react-dom";
import { ConversationSideCar } from "./ConversationSideCar.js";
import { DEFAULT_PROJECTS, formatShortTime, groupExchangesByDate, loadConversations, loadProjects, saveConversations, saveProjects, type Conversation, type Exchange, type Project } from "./conversations.js";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowUp, Archive, Bot, Boxes, Calendar, Check, CheckSquare, Copy, Cpu, Folder, FolderKanban, Lightbulb, Mail, MessageSquare, MoreHorizontal, Pencil, Pin, RotateCcw, Share2, SlidersHorizontal, Sparkles, ThumbsDown, ThumbsUp, Trash2 } from "lucide-react";
import { Button } from "@codexsun/ui/components/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@codexsun/ui/components/ui/dialog";
import { Input } from "@codexsun/ui/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@codexsun/ui/components/ui/popover";
import { Spinner } from "@codexsun/ui/components/ui/spinner";
import { MdiTopologyRegion, type MdiTopologyAdapter } from "@codexsun/ui-desk";
import { useMutation, useQuery } from "@tanstack/react-query";
import { sendPrompt } from "./prompt-api.js";
import { desktopZetroStatus, isDesktopZetro } from "./desktop-bridge.js";
import { ComposerOptions } from "./ComposerOptions.js";
import { createRun } from "./workflow-api.js";
import { WorkflowPanel, type WorkflowMode } from "./WorkflowPanel.js";
import { archiveProjectChats, deleteConversation as deleteStoredConversation, deleteProject as deleteStoredProject, getWorkspace, saveConversation as saveStoredConversation, saveProject as saveStoredProject } from "./workspace-api.js";
import { getZetroSettings } from "./settings-api.js";
import { TaskHandoffControls, TaskHandoffResult } from "./TaskHandoffControls.js";

export const ZETRO_MODELS = [
  { id: "codex-specialist", name: "Codex Specialist", badge: "Docker · Sandbox", desc: "Isolated specialist container with code execution tools." },
  { id: "claude-3-7-sonnet", name: "Claude 3.7 Sonnet", badge: "Reasoning · 200k", desc: "Advanced hybrid reasoning and extended context." },
  { id: "gpt-4o", name: "GPT-4o", badge: "Vision · Fast", desc: "High-speed multimodal intelligence with vision tools." },
  { id: "deepseek-r1", name: "DeepSeek R1", badge: "Deep Logic", desc: "Specialized open-weight reasoning model." },
  { id: "local-demo", name: "Local Demo", badge: "Offline Echo", desc: "Simulated deterministic replies for local testing." },
];

export const ZETRO_FEATURES = [
  { id: "codeExecution", label: "Code Execution", desc: "Run code inside isolated Docker sandbox" },
  { id: "deepReasoning", label: "Deep Reasoning", desc: "Include step-by-step thinking evidence" },
  { id: "multimodal", label: "Multimodal Processing", desc: "Inspect image, document, and audio files" },
  { id: "webTools", label: "Web & API Tools", desc: "External search and specialist tool dispatch" },
];

export type PendingTurn = {
  id: string;
  prompt: string;
  timestamp: string;
  status: "thinking" | "streaming";
  statusText: string;
  activities?: { id: string; label: string; status: string }[];
  streamedResult: string;
};

function streamText(
  fullText: string,
  onUpdate: (partial: string) => void,
  onDone: () => void
): () => void {
  if (!fullText) {
    onDone();
    return () => {};
  }
  const len = fullText.length;
  const targetDuration = Math.min(1500, Math.max(200, len * 3));
  const intervalMs = 20;
  const totalSteps = Math.max(1, Math.floor(targetDuration / intervalMs));
  const stepSize = Math.max(1, Math.ceil(len / totalSteps));

  let currentIndex = 0;
  let timer: ReturnType<typeof setInterval> | null = setInterval(() => {
    currentIndex = Math.min(len, currentIndex + stepSize);
    onUpdate(fullText.slice(0, currentIndex));
    if (currentIndex >= len) {
      if (timer) clearInterval(timer);
      timer = null;
      onDone();
    }
  }, intervalMs);

  return () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

export function PromptWorkspace({ topology, sideCarTarget }: { topology?: MdiTopologyAdapter; sideCarTarget?: HTMLElement | null }) {
  const [conversations, setConversations] = useState<Conversation[]>(() => { try { return loadConversations(localStorage); } catch { return []; } });
  const [projects, setProjects] = useState<Project[]>(() => { try { return loadProjects(localStorage); } catch { return DEFAULT_PROJECTS; } });
  const [activeId, setActiveId] = useState<string>(() => crypto.randomUUID());
  const [newConversationProjectId, setNewConversationProjectId] = useState<string | undefined>();
  const [selectedModelId, setSelectedModelId] = useState(() => {
    try { return localStorage.getItem("zetro.selected-model.v1") ?? "codex-specialist"; } catch { return "codex-specialist"; }
  });
  const [modelOpen, setModelOpen] = useState(false);
  const [features, setFeatures] = useState<{ [key: string]: boolean }>({
    codeExecution: true,
    deepReasoning: true,
    multimodal: true,
    webTools: false,
  });
  const [connected, setConnected] = useState(true);
  const [attachments, setAttachments] = useState<PromptAttachment[]>([]);
  const [attachmentBusy, setAttachmentBusy] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [showActivity, setShowActivity] = useState(false);
  const [motion, setMotion] = useState(true);
  const [workflowEnabled, setWorkflowEnabled] = useState(false);
  const [workflowMode, setWorkflowMode] = useState<WorkflowMode>("sequential");
  const [manualApprovals, setManualApprovals] = useState(true);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameTargetId, setRenameTargetId] = useState<string | null>(null);
  const [newChatTitle, setNewChatTitle] = useState("");
  const workspaceHydrated = useRef(false);
  const workspace = useQuery({ queryKey: ["zetro-workspace"], queryFn: getWorkspace });
  const zetroSettings = useQuery({ queryKey: ["zetro-settings"], queryFn: getZetroSettings, retry: 5 });
  const mutation = useMutation({ mutationFn: sendPrompt });
  const workflowMutation = useMutation({ mutationFn: createRun });
  const [pendingTurn, setPendingTurn] = useState<PendingTurn | null>(null);
  const activeStreamCancel = useRef<(() => void) | null>(null);
  const sending = mutation.isPending || workflowMutation.isPending || pendingTurn !== null;
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const promptInputRef = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => () => {
    request.current?.abort();
    activeStreamCancel.current?.();
  }, []);
  useEffect(() => {
    if (!workspace.data || workspaceHydrated.current) return;
    workspaceHydrated.current = true;
    if (workspace.data.projects.length || workspace.data.conversations.length) {
      setProjects(workspace.data.projects);
      setConversations(workspace.data.conversations);
      return;
    }
    void Promise.all([...projects.map(saveStoredProject), ...conversations.map(saveStoredConversation)]);
  }, [workspace.data, projects, conversations]);
  useEffect(() => { bottom.current?.scrollIntoView({ block: "end" }); }, [exchanges, sending, pendingTurn?.streamedResult, pendingTurn?.statusText]);
  useEffect(() => { promptInputRef.current?.focus(); }, [activeId]);
  useEffect(() => { if (!sending) promptInputRef.current?.focus(); }, [sending]);
  useEffect(() => {
    const refresh = () => void zetroSettings.refetch();
    window.addEventListener("zetro-settings-updated", refresh);
    return () => window.removeEventListener("zetro-settings-updated", refresh);
  }, [zetroSettings.refetch]);
  useEffect(() => {
    let active = true;
    async function checkHealth() {
      try {
        if (isDesktopZetro()) {
          const status = await desktopZetroStatus();
          if (active) setConnected(status.status === "ok" && status.agent === "ready");
          return;
        }
        const res = await platformFetch(`${import.meta.env.VITE_ZETRO_API_URL ?? ""}/health`, { signal: AbortSignal.timeout(2500) });
        if (active) setConnected(res.ok);
      } catch {
        if (active) setConnected(false);
      }
    }
    void checkHealth();
    const timer = setInterval(() => void checkHealth(), 15_000);
    return () => { active = false; clearInterval(timer); };
  }, []);

  const currentModel = ZETRO_MODELS.find((m) => m.id === selectedModelId) ?? ZETRO_MODELS[0]!;

  function onModelChange(id: string) {
    setSelectedModelId(id);
    try { localStorage.setItem("zetro.selected-model.v1", id); } catch { /* ignore */ }
  }

  function copyText(text: string, id: string) {
    void navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 2000);
  }

  function undoTo(index: number) {
    const target = exchanges[index];
    if (!target) return;
    const nextExchanges = exchanges.slice(0, index);
    setExchanges(nextExchanges);
    setPrompt(target.prompt);
    setTimeout(() => promptInputRef.current?.focus(), 0);
    const conversation = conversations.find((item) => item.id === activeId);
    if (conversation) {
      const next = [{ ...conversation, exchanges: nextExchanges, updatedAt: new Date().toISOString() }, ...conversations.filter((item) => item.id !== activeId)];
      setConversations(next);
      try { saveConversations(localStorage, next); } catch { /* ignore */ }
      void saveStoredConversation(next[0]!);
    }
  }

  function toggleFeedback(id: string, value: "up" | "down") {
    const updated = exchanges.map((ex) => (ex.id === id ? { ...ex, feedback: ex.feedback === value ? undefined : value } : ex));
    setExchanges(updated);
    const conversation = conversations.find((item) => item.id === activeId);
    if (conversation) {
      const next = [{ ...conversation, exchanges: updated, updatedAt: new Date().toISOString() }, ...conversations.filter((item) => item.id !== activeId)];
      setConversations(next);
      try { saveConversations(localStorage, next); } catch { /* ignore */ }
      void saveStoredConversation(next[0]!);
    }
  }

  function linkTask(exchangeId: string, taskId: string) {
    const updated = exchanges.map((exchange) => exchange.id === exchangeId ? { ...exchange, taskId } : exchange);
    setExchanges(updated);
    const conversation = conversations.find((item) => item.id === activeId);
    if (conversation) {
      const saved = { ...conversation, exchanges: updated, updatedAt: new Date().toISOString() };
      const next = [saved, ...conversations.filter((item) => item.id !== activeId)];
      setConversations(next);
      try { saveConversations(localStorage, next); } catch { /* ignore */ }
      void saveStoredConversation(saved);
    }
    setActionNotice("Task started. Zetro will track its results here.");
    setTimeout(() => setActionNotice(null), 2500);
  }

  function shareWhatsApp(text: string) {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function shareEmail(subject: string, text: string) {
    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function handleAction(exchange: Exchange, actionType: "task" | "idea" | "module") {
    let notice = "";
    if (actionType === "task") {
      void navigator.clipboard.writeText(`Task: ${exchange.prompt}\n\nOutcome / Solution:\n${exchange.result}`);
      notice = "Copied as task to clipboard!";
    } else if (actionType === "idea") {
      void navigator.clipboard.writeText(`Idea: ${exchange.prompt}\n\nInsight:\n${exchange.result}`);
      notice = "Saved idea to clipboard!";
    } else if (actionType === "module") {
      const promptText = `Generate modules based on:\n\n${exchange.result.slice(0, 300)}`;
      setPrompt(promptText);
      setTimeout(() => promptInputRef.current?.focus(), 0);
      notice = "Drafted module generation prompt!";
    }
    setActionNotice(notice);
    setTimeout(() => setActionNotice((prev) => (prev === notice ? null : prev)), 2500);
  }

  function handlePinConversation(id: string) {
    const updated = conversations.map((item) => (item.id === id ? { ...item, pinned: !item.pinned } : item));
    setConversations(updated);
    try { saveConversations(localStorage, updated); } catch { /* ignore */ }
    const target = updated.find((item) => item.id === id);
    if (target) void saveStoredConversation(target);
    setActionNotice(target?.pinned ? "Pinned chat to top!" : "Unpinned chat.");
    setTimeout(() => setActionNotice(null), 2000);
  }

  function handleRenameConversation(id: string, newTitle: string) {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    const updated = conversations.map((item) => (item.id === id ? { ...item, title: trimmed } : item));
    setConversations(updated);
    try { saveConversations(localStorage, updated); } catch { /* ignore */ }
    const target = updated.find((item) => item.id === id);
    if (target) void saveStoredConversation(target);
    setActionNotice("Chat renamed.");
    setTimeout(() => setActionNotice(null), 2000);
  }

  function handleCreateProject(name: string, localFolder: string, kind: "project" | "addon" = "project") {
    const trimmed = name.trim();
    if (!trimmed) return;
    const newProj: Project = { id: `${kind}-${Date.now()}`, name: trimmed, localFolder, kind };
    const updated = [...projects, newProj];
    setProjects(updated);
    try { saveProjects(localStorage, updated); } catch { /* ignore */ }
    void saveStoredProject(newProj);
    setActionNotice(`${kind === "addon" ? "Add-on" : "Project"} "${trimmed}" created.`);
    setTimeout(() => setActionNotice(null), 2000);
  }

  function handleEditProject(id: string, name: string, localFolder: string) {
    const target = projects.find((project) => project.id === id);
    if (!target || !name.trim()) return;
    const updatedProject = { ...target, name: name.trim(), localFolder };
    setProjects(projects.map((project) => project.id === id ? updatedProject : project));
    void saveStoredProject(updatedProject);
    setActionNotice("Project updated.");
  }

  function handlePinProject(id: string) {
    const target = projects.find((project) => project.id === id);
    if (!target) return;
    const updatedProject = { ...target, pinned: !target.pinned };
    setProjects(projects.map((project) => project.id === id ? updatedProject : project));
    void saveStoredProject(updatedProject);
  }

  async function handleArchiveProjectChats(id: string) {
    try {
      const snapshot = await archiveProjectChats(id);
      setProjects(snapshot.projects);
      setConversations(snapshot.conversations);
      if (snapshot.conversations.find((item) => item.id === activeId)?.archived) handleNewChat();
      setActionNotice("Project chats archived.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to archive project chats."); }
  }

  async function handleRemoveProject(id: string) {
    try {
      const snapshot = await deleteStoredProject(id);
      setProjects(snapshot.projects);
      setConversations(snapshot.conversations);
      setActionNotice("Project removed. Its chats are now unassigned.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to remove project."); }
  }

  function handleNewChat(projectId?: string) {
    if (request.current) request.current.abort();
    activeStreamCancel.current?.();
    activeStreamCancel.current = null;
    setPendingTurn(null);
    setActiveId(crypto.randomUUID());
    setNewConversationProjectId(projectId);
    setExchanges([]);
    setPrompt("");
    setAttachments([]);
    setError("");
    setTimeout(() => promptInputRef.current?.focus(), 0);
  }

  function handleAssignProject(conversationId: string, projectId?: string) {
    const updated = conversations.map((item) => (item.id === conversationId ? { ...item, projectId } : item));
    setConversations(updated);
    try { saveConversations(localStorage, updated); } catch { /* ignore */ }
    const target = updated.find((item) => item.id === conversationId);
    if (target) void saveStoredConversation(target);
    const proj = projects.find((p) => p.id === projectId);
    setActionNotice(proj ? `Moved to "${proj.name}".` : "Moved to Conversations.");
    setTimeout(() => setActionNotice(null), 2000);
  }

  function handleArchiveConversation(id: string) {
    const updated = conversations.map((item) => (item.id === id ? { ...item, archived: !item.archived } : item));
    setConversations(updated);
    try { saveConversations(localStorage, updated); } catch { /* ignore */ }
    const target = updated.find((item) => item.id === id);
    if (target) void saveStoredConversation(target);
    setActionNotice(target?.archived ? "Archived chat." : "Unarchived chat.");
    setTimeout(() => setActionNotice(null), 2000);
  }

  function handleDeleteConversation(id: string) {
    const updated = conversations.filter((item) => item.id !== id);
    setConversations(updated);
    try { saveConversations(localStorage, updated); } catch { /* ignore */ }
    void deleteStoredConversation(id);
    if (activeId === id) {
      if (updated.length > 0) {
        setActiveId(updated[0]!.id);
        setExchanges(updated[0]!.exchanges);
      } else {
        setActiveId(crypto.randomUUID());
        setExchanges([]);
      }
    }
    setActionNotice("Chat deleted.");
    setTimeout(() => setActionNotice(null), 2000);
  }

  function handleCopyConversation(item: Conversation) {
    const text = `${item.title}\n\n` + item.exchanges.map((e) => `User: ${e.prompt}\nZetro: ${e.result}`).join("\n\n");
    void navigator.clipboard.writeText(text);
    setActionNotice("Conversation copied to clipboard!");
    setTimeout(() => setActionNotice(null), 2000);
  }

  function handleDeleteExchange(index: number) {
    const updated = exchanges.filter((_, i) => i !== index);
    setExchanges(updated);
    const conversation = conversations.find((item) => item.id === activeId);
    if (conversation) {
      const next = [{ ...conversation, exchanges: updated, updatedAt: new Date().toISOString() }, ...conversations.filter((item) => item.id !== activeId)];
      setConversations(next);
      try { saveConversations(localStorage, next); } catch { /* ignore */ }
      void saveStoredConversation(next[0]!);
    }
    setActionNotice("Message removed from history.");
    setTimeout(() => setActionNotice(null), 2000);
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    if (request.current || attachmentBusy || (!prompt.trim() && !attachments.length) || pendingTurn) return;
    const submitted = prompt.trim() || "Process attached files";
    const submittedAttachments = [...attachments];

    // Immediately remove from input area on submit
    setPrompt("");
    setAttachments([]);
    setError("");

    if (workflowEnabled) {
      try {
        await workflowMutation.mutateAsync({ message: submitted, mode: workflowMode, manualApprovals });
        setActionNotice("Workflow saved and started.");
        setTimeout(() => setActionNotice(null), 2500);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Unable to start workflow.");
        setPrompt(submitted);
      } finally {
        setTimeout(() => promptInputRef.current?.focus(), 0);
      }
      return;
    }

    const pendingId = `turn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();

    // Immediately show on history and display live processing actions
    setPendingTurn({
      id: pendingId,
      prompt: submitted,
      timestamp: now,
      status: "thinking",
      statusText: "Thinking",
      activities: [
        { id: "act-1", label: "Receiving prompt", status: "completed" },
        { id: "act-2", label: "Analyzing request", status: "running" },
      ],
      streamedResult: "",
    });

    const controller = new AbortController();
    request.current = controller;

    const stageTimer1 = setTimeout(() => {
      setPendingTurn((prev) => {
        if (!prev || prev.status !== "thinking") return prev;
        return {
          ...prev,
          statusText: "Consulting context & tools…",
          activities: [
            { id: "act-1", label: "Receiving prompt", status: "completed" },
            { id: "act-2", label: "Analyzing request", status: "completed" },
            { id: "act-3", label: "Gathering context", status: "running" },
          ],
        };
      });
    }, 1800);

    const stageTimer2 = setTimeout(() => {
      setPendingTurn((prev) => {
        if (!prev || prev.status !== "thinking") return prev;
        return {
          ...prev,
          statusText: "Synthesizing response…",
          activities: [
            { id: "act-1", label: "Receiving prompt", status: "completed" },
            { id: "act-2", label: "Analyzing request", status: "completed" },
            { id: "act-3", label: "Gathering context", status: "completed" },
            { id: "act-4", label: "Synthesizing answer", status: "running" },
          ],
        };
      });
    }, 3800);

    try {
      const result = await mutation.mutateAsync({
        agentId: zetroSettings.data?.defaultAgentId ?? "zetro",
        message: submitted,
        signal: controller.signal,
        attachments: submittedAttachments,
      });

      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);

      const finalActivities = result.activities?.length
        ? result.activities
        : [
            { id: "act-1", label: "Receiving prompt", status: "completed" },
            { id: "act-2", label: "Analyzing request", status: "completed" },
            { id: "act-3", label: "Synthesizing answer", status: "completed" },
          ];

      // Stream response live
      setPendingTurn((prev) =>
        prev
          ? {
              ...prev,
              status: "streaming",
              statusText: "Responding",
              activities: finalActivities,
              streamedResult: "",
            }
          : null
      );

      await new Promise<void>((resolve) => {
        activeStreamCancel.current = streamText(
          result.message,
          (partial) => {
            setPendingTurn((prev) => (prev ? { ...prev, streamedResult: partial } : null));
          },
          () => {
            activeStreamCancel.current = null;
            resolve();
          }
        );
      });

      const updated: Exchange[] = [
        ...exchanges,
        {
          id: result.runId || pendingId,
          prompt: submitted,
          result: result.message,
          timestamp: now,
          activities: finalActivities,
        },
      ];
      setExchanges(updated);
      const prior = conversations.find((item) => item.id === activeId);
      const conversation: Conversation = {
        id: activeId,
        title: updated[0]!.prompt.slice(0, 100),
        updatedAt: now,
        exchanges: updated,
        projectId: prior?.projectId ?? newConversationProjectId,
        pinned: prior?.pinned,
        archived: prior?.archived,
      };
      const next = [conversation, ...conversations.filter((item) => item.id !== activeId)];
      setConversations(next);
      try {
        saveConversations(localStorage, next);
      } catch {
        setError("Unable to save chat history in this browser.");
      }
      void saveStoredConversation(conversation).catch(() =>
        setError("Unable to save chat history in Zetro.")
      );
      setPendingTurn(null);
    } catch (cause) {
      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      activeStreamCancel.current?.();
      activeStreamCancel.current = null;
      setPendingTurn(null);
      if (!controller.signal.aborted) {
        setError(cause instanceof Error ? cause.message : "Unable to connect to Zetro.");
        setPrompt(submitted);
      }
    } finally {
      request.current = null;
      setTimeout(() => promptInputRef.current?.focus(), 0);
    }
  }

  return <MdiTopologyRegion id="z1" topology={topology} className="flex h-full min-h-0 flex-col bg-background [&>.technical-label]:!left-auto [&>.technical-label]:!right-3">
    {sideCarTarget && createPortal(<ConversationSideCar
      topology={topology}
      conversations={conversations}
      projects={projects}
      activeId={activeId}
      disabled={sending || attachmentBusy}
      onSelect={(item) => {
        if (request.current) request.current.abort();
        activeStreamCancel.current?.();
        activeStreamCancel.current = null;
        setPendingTurn(null);
        setActiveId(item.id);
        setNewConversationProjectId(item.projectId);
        setExchanges(item.exchanges);
        setPrompt("");
        setAttachments([]);
        setError("");
        setTimeout(() => promptInputRef.current?.focus(), 0);
      }}
      onNew={handleNewChat}
      onPin={handlePinConversation}
      onRename={handleRenameConversation}
      onArchive={handleArchiveConversation}
      onDelete={handleDeleteConversation}
      onCopy={handleCopyConversation}
      onCreateProject={handleCreateProject}
      onEditProject={handleEditProject}
      onPinProject={handlePinProject}
      onArchiveProjectChats={(id) => void handleArchiveProjectChats(id)}
      onRemoveProject={(id) => void handleRemoveProject(id)}
      onAssignProject={handleAssignProject}
    />, sideCarTarget)}
    <header {...topology?.regionProps("z3")} className="ito-region relative flex items-center justify-between gap-4 border-b border-border px-6 py-2">
      {topology?.marker("z3")}
      <div className="flex min-w-0 items-center gap-3.5">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Bot className="size-4" />
        </div>
        <div className="flex min-w-0 items-center gap-2.5 text-xs">
          <h1 className="text-sm font-semibold leading-none text-foreground">Zetro</h1>
          <span className="text-muted-foreground/40">·</span>
          <button
            type="button"
            onClick={() => setConnected((prev) => !prev)}
            title={`Status: ${connected ? "Connected" : "Disconnected"} (click to toggle test)`}
            aria-label={`Connection status: ${connected ? "Connected" : "Disconnected"}`}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground cursor-pointer hover:bg-muted"
          >
            <span className={`size-2 rounded-full transition-colors ${connected ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" : "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)]"}`} />
            <span>{connected ? "Connected" : "Disconnected"}</span>
          </button>
          <span className="text-muted-foreground/40">·</span>
          <span className="truncate text-muted-foreground">
            Model: <span className="font-medium text-foreground">{currentModel.name}</span>
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2.5">
        <Popover open={modelOpen} onOpenChange={setModelOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="relative size-8 rounded-full border-border bg-background hover:bg-accent cursor-pointer"
              title={`Select model (active: ${currentModel.name})`}
              aria-label={`Select model (active: ${currentModel.name})`}
            >
              <Cpu className="size-4 text-foreground" />
              <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-background bg-primary" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 rounded-2xl border-border p-3 shadow-lg">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <div>
                <h3 className="text-xs font-semibold text-foreground">Select Model</h3>
                <p className="text-[11px] text-muted-foreground">Active: <span className="font-medium text-foreground">{currentModel.name}</span></p>
              </div>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">{currentModel.badge}</span>
            </div>
            <div className="py-2 space-y-1">
              {ZETRO_MODELS.map((model) => (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => { onModelChange(model.id); setModelOpen(false); }}
                  className={`w-full flex items-start justify-between rounded-xl p-2.5 text-left text-xs transition-colors cursor-pointer ${
                    selectedModelId === model.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-muted text-foreground"
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold text-foreground">{model.name}</div>
                    <div className="text-[10px] text-muted-foreground">{model.badge} · {model.desc}</div>
                  </div>
                  {selectedModelId === model.id && <Check className="size-4 text-primary shrink-0 mt-0.5 ml-2" />}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="relative size-8 rounded-full border-border bg-background hover:bg-accent cursor-pointer"
              title={`Model Features (${Object.values(features).filter(Boolean).length} active)`}
              aria-label="Model features"
            >
              <SlidersHorizontal className="size-4 text-foreground" />
              <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-sm">
                {Object.values(features).filter(Boolean).length}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 rounded-2xl border-border p-3 shadow-lg">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <div>
                <h3 className="text-xs font-semibold text-foreground">Model Features</h3>
                <p className="text-[11px] text-muted-foreground">Capabilities for {currentModel.name}</p>
              </div>
              <Sparkles className="size-4 text-primary" />
            </div>
            <div className="space-y-2 pt-2">
              {ZETRO_FEATURES.map((feature) => (
                <label key={feature.id} className="flex items-center justify-between gap-3 rounded-xl p-2 hover:bg-muted/50 cursor-pointer transition-colors">
                  <div>
                    <span className="block text-xs font-medium text-foreground">{feature.label}</span>
                    <span className="block text-[10px] text-muted-foreground">{feature.desc}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(features[feature.id])}
                    onChange={(e) => setFeatures((prev) => ({ ...prev, [feature.id]: e.target.checked }))}
                    className="size-4 cursor-pointer accent-primary rounded"
                  />
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </header>
    <MdiTopologyRegion id="z4" topology={topology} className="min-h-0 flex-1 overflow-y-auto px-6 py-8"><div aria-live="polite">
      <MdiTopologyRegion id="z4.1" topology={topology} className="mx-auto w-full md:w-4/5 max-w-5xl space-y-8">
        {exchanges.length || pendingTurn ? (
          <>
            {exchanges.length ? (
              groupExchangesByDate(exchanges).map((dateGroup) => (
                <section key={dateGroup.dateKey} aria-label={`Messages from ${dateGroup.dateLabel}`} className="space-y-6">
                  <div className="relative my-6 flex items-center justify-center">
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                      <div className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground shadow-2xs">
                      <Calendar className="size-3 text-muted-foreground" />
                      <span>{dateGroup.dateLabel}</span>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {dateGroup.items.map(({ exchange, index }) => (
                      <article
                        key={exchange.id}
                        className="group/turn relative space-y-4 border-b border-border/50 pb-6 pt-2"
                      >
                        <div className="group ml-auto flex max-w-[90%] flex-col items-end gap-1">
                          <div className="rounded-2xl bg-muted px-4 py-3"><p className="whitespace-pre-wrap break-words text-sm leading-6">{exchange.prompt}</p></div>
                          <div className="flex items-center gap-1.5 px-1 text-[11px] text-muted-foreground opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                            {exchange.timestamp && <span>{formatShortTime(exchange.timestamp)}</span>}
                            <Button type="button" variant="ghost" size="icon" className="size-6 cursor-pointer text-muted-foreground hover:text-foreground" title="Copy prompt" aria-label="Copy prompt" onClick={() => copyText(exchange.prompt, `${exchange.id}-prompt`)}>
                              {copiedId === `${exchange.id}-prompt` ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                            </Button>
                            <Button type="button" variant="ghost" size="icon" className="size-6 cursor-pointer text-muted-foreground hover:text-foreground" title="Undo to this prompt" aria-label="Undo to this prompt" onClick={() => undoTo(index)}>
                              <RotateCcw className="size-3" />
                            </Button>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button type="button" variant="ghost" size="icon" className="size-6 cursor-pointer text-muted-foreground hover:text-foreground" title="More options" aria-label="Prompt options">
                                  <MoreHorizontal className="size-3" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent align="end" className="w-36 p-1 rounded-xl border-border shadow-md">
                                <Button type="button" variant="ghost" className="w-full justify-start gap-2 h-8 px-2 text-xs cursor-pointer" onClick={() => handlePinConversation(activeId)}>
                                  <Pin className="size-3.5" />
                                  Pin
                                </Button>
                                <Button type="button" variant="ghost" className="w-full justify-start gap-2 h-8 px-2 text-xs cursor-pointer" onClick={() => {
                                  const current = conversations.find((c) => c.id === activeId);
                                  setRenameTargetId(activeId);
                                  setNewChatTitle(current?.title ?? "New Chat");
                                  setRenameDialogOpen(true);
                                }}>
                                  <Pencil className="size-3.5" />
                                  Rename
                                </Button>
                                <Button type="button" variant="ghost" className="w-full justify-start gap-2 h-8 px-2 text-xs cursor-pointer" onClick={() => copyText(exchange.prompt, `${exchange.id}-prompt`)}>
                                  <Copy className="size-3.5" />
                                  Copy
                                </Button>
                                <Button type="button" variant="ghost" className="w-full justify-start gap-2 h-8 px-2 text-xs cursor-pointer" onClick={() => handleArchiveConversation(activeId)}>
                                  <Archive className="size-3.5" />
                                  Archive
                                </Button>
                                <Button type="button" variant="ghost" className="w-full justify-start gap-2 h-8 px-2 text-xs cursor-pointer text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteExchange(index)}>
                                  <Trash2 className="size-3.5" />
                                  Delete
                                </Button>
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                        <div className={`group flex items-start gap-3 ${motion ? "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300" : ""}`}>
                          <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary mt-0.5">
                            <Bot className="size-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="whitespace-pre-wrap break-words text-sm leading-7">{exchange.result}</p>
                            <div className="mt-1 flex items-center gap-1 text-muted-foreground opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                              {exchange.timestamp && <span className="mr-1 text-[10px] text-muted-foreground">{formatShortTime(exchange.timestamp)}</span>}
                              <Button type="button" variant="ghost" size="icon" className="size-7 cursor-pointer hover:text-foreground" title="Copy response" aria-label="Copy response" onClick={() => copyText(exchange.result, `${exchange.id}-result`)}>
                                {copiedId === `${exchange.id}-result` ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                              </Button>
                              <Button type="button" variant="ghost" size="icon" className={`size-7 cursor-pointer hover:text-foreground ${exchange.feedback === "up" ? "text-primary bg-primary/10" : ""}`} title="Thumbs up" aria-label="Thumbs up" onClick={() => toggleFeedback(exchange.id, "up")}>
                                <ThumbsUp className={`size-3.5 ${exchange.feedback === "up" ? "fill-current" : ""}`} />
                              </Button>
                              <Button type="button" variant="ghost" size="icon" className={`size-7 cursor-pointer hover:text-foreground ${exchange.feedback === "down" ? "text-destructive bg-destructive/10" : ""}`} title="Thumbs down" aria-label="Thumbs down" onClick={() => toggleFeedback(exchange.id, "down")}>
                                <ThumbsDown className={`size-3.5 ${exchange.feedback === "down" ? "fill-current" : ""}`} />
                              </Button>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button type="button" variant="ghost" size="icon" className="size-7 cursor-pointer hover:text-foreground" title="Share" aria-label="Share response">
                                    <Share2 className="size-3.5" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent align="start" className="w-52 p-1.5 rounded-xl">
                                  <Button type="button" variant="ghost" className="w-full justify-start gap-2 h-8 px-2 text-xs cursor-pointer" onClick={() => shareWhatsApp(`Zetro Response:\n\n${exchange.result}`)}>
                                    <MessageSquare className="size-3.5 text-emerald-600" />
                                    Share via WhatsApp
                                  </Button>
                                  <Button type="button" variant="ghost" className="w-full justify-start gap-2 h-8 px-2 text-xs cursor-pointer" onClick={() => shareEmail(`Zetro: ${exchange.prompt.slice(0, 40)}`, `Prompt: ${exchange.prompt}\n\nResponse:\n${exchange.result}`)}>
                                    <Mail className="size-3.5 text-blue-500" />
                                    Share via Email
                                  </Button>
                                </PopoverContent>
                              </Popover>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button type="button" variant="ghost" size="icon" className="size-7 cursor-pointer hover:text-foreground" title="Actions" aria-label="Response actions">
                                    <Sparkles className="size-3.5" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent align="start" className="w-48 p-1.5 rounded-xl">
                                  <Button type="button" variant="ghost" className="w-full justify-start gap-2 h-8 px-2 text-xs cursor-pointer" onClick={() => handleAction(exchange, "task")}>
                                    <CheckSquare className="size-3.5 text-primary" />
                                    Convert to task
                                  </Button>
                                  <Button type="button" variant="ghost" className="w-full justify-start gap-2 h-8 px-2 text-xs cursor-pointer" onClick={() => handleAction(exchange, "idea")}>
                                    <Lightbulb className="size-3.5 text-amber-500" />
                                    Add to ideas
                                  </Button>
                                  <Button type="button" variant="ghost" className="w-full justify-start gap-2 h-8 px-2 text-xs cursor-pointer" onClick={() => handleAction(exchange, "module")}>
                                    <Boxes className="size-3.5 text-indigo-500" />
                                    Generate modules
                                  </Button>
                                </PopoverContent>
                              </Popover>
                              <TaskHandoffControls
                                chatReview={exchanges.slice(0, index).map((item) => `You: ${item.prompt}\nZetro: ${item.result}`).join("\n\n")}
                                onTaskCreated={(taskId) => linkTask(exchange.id, taskId)}
                                prompt={exchange.prompt}
                                response={exchange.result}
                                taskId={exchange.taskId}
                              />
                              <div className="ml-auto">
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button type="button" variant="ghost" size="icon" className="size-7 cursor-pointer hover:text-foreground" title="More options" aria-label="More options">
                                      <MoreHorizontal className="size-3.5" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent align="end" className="w-36 p-1 rounded-xl border-border shadow-md">
                                    <Button type="button" variant="ghost" className="w-full justify-start gap-2 h-8 px-2 text-xs cursor-pointer" onClick={() => handlePinConversation(activeId)}>
                                      <Pin className="size-3.5" />
                                      Pin
                                    </Button>
                                    <Button type="button" variant="ghost" className="w-full justify-start gap-2 h-8 px-2 text-xs cursor-pointer" onClick={() => {
                                      const current = conversations.find((c) => c.id === activeId);
                                      setRenameTargetId(activeId);
                                      setNewChatTitle(current?.title ?? "New Chat");
                                      setRenameDialogOpen(true);
                                    }}>
                                      <Pencil className="size-3.5" />
                                      Rename
                                    </Button>
                                    <Button type="button" variant="ghost" className="w-full justify-start gap-2 h-8 px-2 text-xs cursor-pointer" onClick={() => copyText(exchange.prompt, `${exchange.id}-prompt`)}>
                                      <Copy className="size-3.5" />
                                      Copy
                                    </Button>
                                    <Button type="button" variant="ghost" className="w-full justify-start gap-2 h-8 px-2 text-xs cursor-pointer" onClick={() => handleArchiveConversation(activeId)}>
                                      <Archive className="size-3.5" />
                                      Archive
                                    </Button>
                                    <Button type="button" variant="ghost" className="w-full justify-start gap-2 h-8 px-2 text-xs cursor-pointer text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteExchange(index)}>
                                      <Trash2 className="size-3.5" />
                                      Delete
                                    </Button>
                                  </PopoverContent>
                                </Popover>
                              </div>
                            </div>
                            <TaskHandoffResult taskId={exchange.taskId} />
                          </div>
                        </div>
                        {showActivity && <div className="ml-9 space-y-1 border-l border-border pl-3 text-xs text-muted-foreground">{exchange.activities?.length ? exchange.activities.map((item) => <p key={item.id}>{item.label} · {item.status}</p>) : <p>No tool evidence reported.</p>}</div>}
                      </article>
                    ))}
                  </div>
                </section>
              ))
            ) : (
              <div className="relative my-6 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground shadow-2xs">
                  <Calendar className="size-3 text-muted-foreground" />
                  <span>Today</span>
                </div>
              </div>
            )}

            {pendingTurn && (
              <article className="group/turn relative space-y-4 pb-6 pt-2">
                <div className="group ml-auto flex max-w-[90%] flex-col items-end gap-1">
                  <div className="rounded-2xl bg-muted px-4 py-3">
                    <p className="whitespace-pre-wrap break-words text-sm leading-6">{pendingTurn.prompt}</p>
                  </div>
                  <div className="flex items-center gap-1.5 px-1 text-[11px] text-muted-foreground">
                    {pendingTurn.timestamp && <span>{formatShortTime(pendingTurn.timestamp)}</span>}
                    <span className="text-[10px] text-muted-foreground/70">· Live</span>
                  </div>
                </div>
                <div className={`group flex items-start gap-3 ${motion ? "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300" : ""}`}>
                  <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary mt-0.5">
                    <Bot className="size-3.5" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    {pendingTurn.status !== "streaming" ? (
                      <div className="flex items-center gap-2.5 rounded-xl bg-muted/40 px-3.5 py-2 text-sm text-muted-foreground w-fit">
                        <Spinner className="size-3.5 text-primary" />
                        <span className="text-xs font-medium text-foreground">{pendingTurn.statusText}</span>
                        <span className="inline-flex items-center gap-1 pl-0.5">
                          <span className="size-1 rounded-full bg-primary/70 animate-bounce [animation-delay:-0.3s]" />
                          <span className="size-1 rounded-full bg-primary/70 animate-bounce [animation-delay:-0.15s]" />
                          <span className="size-1 rounded-full bg-primary/70 animate-bounce" />
                        </span>
                      </div>
                    ) : (
                      <div>
                        <p className="whitespace-pre-wrap break-words text-sm leading-7">
                          {pendingTurn.streamedResult}
                          <span className="inline-block w-1.5 h-4 ml-1 bg-primary animate-pulse align-middle" />
                        </p>
                      </div>
                    )}
                    {showActivity && pendingTurn.activities?.length ? (
                      <div className="ml-9 space-y-1 border-l border-border pl-3 text-xs text-muted-foreground">
                        {pendingTurn.activities.map((item) => (
                          <p key={item.id} className="flex items-center gap-2">
                            <span className={`size-1.5 rounded-full ${item.status === "running" ? "bg-primary animate-ping" : "bg-emerald-500"}`} />
                            <span>{item.label} · {item.status}</span>
                          </p>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>
            )}
          </>
        ) : (
          <div className="py-16 text-center"><h2 className="text-xl font-medium">What would you like to send?</h2><p className="mt-3 text-sm text-muted-foreground">Write a prompt to get a response from Zetro.</p></div>
        )}
        {sending && !pendingTurn && <article className="flex items-start gap-3 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300">
          <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary mt-0.5">
            <Bot className="size-3.5" />
          </div>
          <div className="flex items-center gap-2.5 rounded-xl bg-muted/40 px-3.5 py-2 text-sm text-muted-foreground w-fit">
            <Spinner className="size-3.5 text-primary" />
            <span className="text-xs font-medium text-foreground">Thinking</span>
            <span className="inline-flex items-center gap-1 pl-0.5">
              <span className="size-1 rounded-full bg-primary/70 animate-bounce [animation-delay:-0.3s]" />
              <span className="size-1 rounded-full bg-primary/70 animate-bounce [animation-delay:-0.15s]" />
              <span className="size-1 rounded-full bg-primary/70 animate-bounce" />
            </span>
          </div>
        </article>}
        <div ref={bottom} />
      </MdiTopologyRegion>
    </div>
    {actionNotice && <div role="status" className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 rounded-lg bg-foreground px-3 py-1.5 text-xs text-background shadow-lg transition-all animate-in fade-in slide-in-from-bottom-2">{actionNotice}</div>}
    </MdiTopologyRegion>
    <MdiTopologyRegion id="z5" topology={topology} className="shrink-0 px-3 pb-5 pt-3 sm:px-6">
      <form
        onClick={() => promptInputRef.current?.focus()}
        onSubmit={(event) => void send(event)}
        className="relative mx-auto w-full md:w-4/5 max-w-5xl rounded-2xl border border-input bg-card p-3 shadow-sm cursor-text"
      >
        <MdiTopologyRegion id="z5.5" topology={topology} className="!absolute -top-5 right-3 z-10 cursor-default"><ComposerOptions activity={showActivity} motion={motion} onActivity={setShowActivity} onMotion={setMotion} workflow={<MdiTopologyRegion id="z5.6" topology={topology}><WorkflowPanel enabled={workflowEnabled} mode={workflowMode} manualApprovals={manualApprovals} onEnabled={setWorkflowEnabled} onMode={setWorkflowMode} onManualApprovals={setManualApprovals} /></MdiTopologyRegion>} /></MdiTopologyRegion>
        <MdiTopologyRegion id="z5.1" topology={topology}><textarea ref={promptInputRef} autoFocus aria-label="Prompt" disabled={sending} maxLength={20000} value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder={sending ? "Waiting for Zetro to respond…" : "Send a prompt…"} className="min-h-20 w-full resize-none border-0 bg-transparent p-2 text-sm leading-6 shadow-none outline-none ring-0 focus:border-0 focus:shadow-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0" onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); setTimeout(() => promptInputRef.current?.focus(), 0); } }} />
        </MdiTopologyRegion>
        <AttachmentPreviews items={attachments} onChange={setAttachments} disabled={sending || attachmentBusy} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <AttachmentControls items={attachments} onChange={setAttachments} disabled={sending} onBusy={setAttachmentBusy} onError={setError} />
            <MdiTopologyRegion id="z5.2" topology={topology}><span role="status" className="text-xs text-muted-foreground">{sending ? "Waiting for Zetro…" : "Zetro · Docker"}</span></MdiTopologyRegion>
          </div>
          <MdiTopologyRegion id="z5.3" topology={topology}><Button type="submit" aria-label="Send prompt" disabled={sending || attachmentBusy || (!prompt.trim() && !attachments.length)} className="rounded-full cursor-pointer" size="icon"><ArrowUp className="size-4" /></Button></MdiTopologyRegion>
        </div>
        {error && <MdiTopologyRegion id="z5.4" topology={topology}><p role="alert" className="mt-3 text-sm text-destructive">{error}</p></MdiTopologyRegion>}
      </form>
    </MdiTopologyRegion>

    <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Pencil className="size-4 text-primary" />
            Rename Chat
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Enter a new title for this conversation.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const trimmed = newChatTitle.trim();
            if (trimmed && renameTargetId) {
              handleRenameConversation(renameTargetId, trimmed);
              setRenameDialogOpen(false);
            }
          }}
          className="space-y-4 pt-2"
        >
          <div className="space-y-1.5">
            <label htmlFor="rename-chat-input" className="text-xs font-medium text-foreground">
              Title
            </label>
            <Input
              id="rename-chat-input"
              placeholder="Enter title..."
              value={newChatTitle}
              onChange={(e) => setNewChatTitle(e.target.value)}
              autoFocus
              className="h-9 text-sm"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRenameDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!newChatTitle.trim()}
            >
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </MdiTopologyRegion>;
}

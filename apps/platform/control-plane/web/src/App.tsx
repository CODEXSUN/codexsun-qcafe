import type { ChatActivity, ChatTurnResponse } from "@codexsun/contracts";
import { Activity, Bell, Bot, Box, Check, ChevronDown, ChevronRight, Circle, Command, Database, Eye, EyeOff, FileCode2, FolderKanban, FolderTree, GitBranch, HelpCircle, Highlighter, History, Layers3, ListTree, Menu, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelsTopLeft, Play, Plus, Search, Send, Settings2, SlidersHorizontal, Sparkles, Tags, Terminal, Wrench, X } from "lucide-react";
import { type FormEvent, type KeyboardEvent, useEffect, useMemo, useState } from "react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";

const apiUrl = import.meta.env.VITE_OS_API_URL ?? "http://127.0.0.1:4100";
type Message = { activities?: ChatActivity[]; content: string; id: string; role: "assistant" | "user"; usage?: ChatTurnResponse["usage"] };
const starters = ["Give me a concise architecture tour of this repository.", "Find the highest-risk gap in the current control plane.", "Plan the next safe vertical slice without changing files."];
const technicalSections = [
  { id: "01", name: "Global command bar", scope: "Application chrome", description: "Global navigation, workspace commands, branch state, and utility actions." },
  { id: "02", name: "Primary icon dock", scope: "Navigation", description: "Collapsed-first entry points for chat, explorer, source control, applications, and data." },
  { id: "03", name: "Workspace drawer", scope: "Navigation", description: "Resizable conversation and project navigation drawer." },
  { id: "04", name: "Conversation block", scope: "Workspace drawer", description: "Conversation creation and active engineering-chat selection." },
  { id: "05", name: "Project tree", scope: "Workspace drawer", description: "Repository-oriented navigation for control-plane and agent-run surfaces." },
  { id: "06", name: "Resizable boundary", scope: "Workspace layout", description: "Draggable boundary between the workspace drawer and center canvas." },
  { id: "07", name: "Agent status bar", scope: "Center workspace", description: "Current sidecar provider and workspace safety mode." },
  { id: "08", name: "Conversation canvas", scope: "Center workspace", description: "Main read-only engineering conversation surface." },
  { id: "09", name: "Starter prompts", scope: "Conversation canvas", description: "Safe, pre-scoped prompts for repository understanding and planning." },
  { id: "10", name: "Message composer", scope: "Conversation canvas", description: "Input area for a new Codex sidecar turn." },
  { id: "11", name: "Properties drawer", scope: "Context", description: "Latest run status, activity summaries, and usage information." },
  { id: "12", name: "Context icon dock", scope: "Context", description: "Compact access to activity, properties, outline, history, and technical inspection." },
] as const;
type TechnicalSectionId = typeof technicalSections[number]["id"];

export function App() {
  const [conversationId, setConversationId] = useState<string>();
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [leftOpen, setLeftOpen] = useState(true);
  const [menuOpen, setMenuOpen] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [rightOpen, setRightOpen] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [boundaryHighlight, setBoundaryHighlight] = useState(false);
  const [labelsVisible, setLabelsVisible] = useState(true);
  const [selectedSection, setSelectedSection] = useState<TechnicalSectionId>("01");
  const latestRun = useMemo(() => [...messages].reverse().find((message) => message.activities?.length), [messages]);

  useEffect(() => {
    function toggleWorkspaceDrawer(event: globalThis.KeyboardEvent) {
      if (event.ctrlKey && !event.altKey && !event.metaKey && event.key.toLowerCase() === "b") {
        event.preventDefault();
        setLeftOpen((open) => !open);
      }
    }

    window.addEventListener("keydown", toggleWorkspaceDrawer);
    return () => window.removeEventListener("keydown", toggleWorkspaceDrawer);
  }, []);

  useEffect(() => {
    if (!inspectorOpen) return;

    function closeInspectorOnClickAway(event: PointerEvent) {
      const target = event.target instanceof Element ? event.target : null;
      if (!target?.closest(".technical-inspector, .topology-inspection-control")) setInspectorOpen(false);
    }

    window.addEventListener("pointerdown", closeInspectorOnClickAway);
    return () => window.removeEventListener("pointerdown", closeInspectorOnClickAway);
  }, [inspectorOpen]);

  async function submit(message = input) {
    const cleanMessage = message.trim();
    if (!cleanMessage || isSending) return;
    setMessages((current) => [...current, { content: cleanMessage, id: crypto.randomUUID(), role: "user" }]);
    setInput("");
    setIsSending(true);
    try {
      const response = await fetch(`${apiUrl}/api/v1/chat/messages`, { body: JSON.stringify({ conversationId, message: cleanMessage }), headers: { "content-type": "application/json" }, method: "POST" });
      const body = await response.json() as ChatTurnResponse | { error: string };
      if (!response.ok || "error" in body) throw new Error("error" in body ? body.error : `API returned ${response.status}.`);
      setConversationId(body.conversationId);
      setMessages((current) => [...current, { activities: body.activities, content: body.message, id: body.runId, role: "assistant", usage: body.usage }]);
    } catch (error) {
      setMessages((current) => [...current, { content: error instanceof Error ? error.message : "The Codex sidecar is unavailable.", id: crypto.randomUUID(), role: "assistant" }]);
    } finally { setIsSending(false); }
  }

  function reset() { setConversationId(undefined); setMessages([]); setInput(""); }
  function inspect(id: TechnicalSectionId) { setSelectedSection(id); setInspectorOpen(true); }

  function toggleBoundaryHighlight() {
    setBoundaryHighlight((enabled) => !enabled);
    setInspectorOpen(false);
  }

  return <div className="app-shell" data-ito-highlight={boundaryHighlight} data-ito-labels={labelsVisible} data-ito-selected={selectedSection} data-left-open={leftOpen} data-menu-open={menuOpen} data-right-open={rightOpen}>
    <CommonTopMenu onInspect={inspect} open={menuOpen} onToggle={() => setMenuOpen((open) => !open)} />
    <LeftDock onInspect={inspect} onNew={reset} onToggle={() => setLeftOpen((open) => !open)} />
    <ResizablePanelGroup orientation="horizontal" className="workspace-panels">
      {leftOpen && <>
        <ResizablePanel defaultSize="24%" minSize="200px" maxSize="380px"><NavigationDrawer onInspect={inspect} onNew={reset} /></ResizablePanel>
        <ResizableHandle className="ito-resizable-boundary" data-ito-section="06" withHandle><TechLabel id="06" onInspect={inspect} /></ResizableHandle>
      </>}
      <ResizablePanel defaultSize={leftOpen ? "76%" : "100%"} minSize="420px">
        <main className="chat-workspace">
          <WorkspaceDrawerToggle open={leftOpen} onToggle={() => setLeftOpen((open) => !open)} />
          <header className="topbar technical-region" data-ito-section="07"><TechLabel id="07" onInspect={inspect} /><div className="model-label"><span className="status-dot" /><strong>Codex sidecar</strong><ChevronDown size={14} /></div><div className="safety-label"><Circle size={8} fill="currentColor" /> Read-only workspace</div></header>
          <section className="conversation technical-region" data-ito-section="08" aria-live="polite"><TechLabel id="08" onInspect={inspect} />
            {messages.length === 0 ? <Welcome onInspect={inspect} onSelect={(prompt) => void submit(prompt)} /> : messages.map((message) => <MessageBubble key={message.id} message={message} />)}
            {isSending && <div className="assistant-message thinking"><Sparkles size={17} /><span>Codex is working through the repository…</span></div>}
          </section>
          <Composer input={input} isSending={isSending} onChange={setInput} onInspect={inspect} onSubmit={() => void submit()} />
        </main>
      </ResizablePanel>
    </ResizablePanelGroup>
    <RunPanel message={latestRun} onClose={() => setRightOpen(false)} onInspect={inspect} />
    <RightDock onInspect={inspect} onToggle={() => setRightOpen((open) => !open)} />
    <TopologyInspectionControl onClick={() => setInspectorOpen((open) => !open)} open={inspectorOpen} />
    {inspectorOpen && <TechnicalInspector highlighted={boundaryHighlight} labelsVisible={labelsVisible} onClose={() => setInspectorOpen(false)} onSelect={setSelectedSection} onToggleHighlight={toggleBoundaryHighlight} onToggleLabels={() => setLabelsVisible((visible) => !visible)} selected={selectedSection} />}
  </div>;
}

function CommonTopMenu({ onInspect, onToggle, open }: { onInspect: (id: TechnicalSectionId) => void; onToggle: () => void; open: boolean }) {
  return <header className="common-top-menu technical-region" data-ito-section="01"><TechLabel id="01" onInspect={onInspect} /><button aria-label={open ? "Collapse main menu" : "Expand main menu"} className="menu-toggle" onClick={onToggle} title="Toggle main menu"><Menu size={18} /></button><div className="top-product"><span>CODEXSUN OS</span><small>Engineering workspace</small></div>{open && <nav aria-label="Application menu"><TopMenuButton icon={PanelsTopLeft} label="Workspace" /><TopMenuButton icon={FolderKanban} label="Project" /><TopMenuButton icon={Bot} label="Agents" /><TopMenuButton icon={Eye} label="View" /><TopMenuButton icon={Play} label="Run" /><TopMenuButton icon={HelpCircle} label="Help" /></nav>}<div className="top-actions"><span><GitBranch size={14} /> main</span><button aria-label="Run workspace" title="Run workspace"><Play size={15} /></button><button aria-label="Help" title="Help"><HelpCircle size={16} /></button></div></header>;
}

function TopMenuButton({ icon: Icon, label }: { icon: typeof Bot; label: string }) {
  return <button aria-label={label} title={label}><Icon size={16} /></button>;
}

function LeftDock({ onInspect, onNew, onToggle }: { onInspect: (id: TechnicalSectionId) => void; onNew: () => void; onToggle: () => void }) {
  return <aside className="icon-dock left-dock technical-region" data-ito-section="02" aria-label="Primary tools"><TechLabel id="02" onInspect={onInspect} /><div className="dock-logo" title="CODEXSUN OS"><Box size={19} /></div><div className="dock-tools"><DockButton active icon={Bot} label="Chat" onClick={onToggle} /><DockButton icon={FolderTree} label="Explorer" onClick={onToggle} /><DockButton icon={GitBranch} label="Source control" onClick={onToggle} /><DockButton icon={Layers3} label="Applications" onClick={onToggle} /><DockButton icon={Database} label="Data" onClick={onToggle} /></div><div className="dock-bottom"><DockButton icon={Plus} label="New conversation" onClick={onNew} /><DockButton icon={Settings2} label="Settings" /></div></aside>;
}

function NavigationDrawer({ onInspect, onNew }: { onInspect: (id: TechnicalSectionId) => void; onNew: () => void }) {
  return <aside className="navigation-drawer technical-region" data-ito-section="03"><TechLabel id="03" onInspect={onInspect} /><DrawerHeading label="Workspace" side="left" /><div className="technical-region" data-ito-section="04"><TechLabel id="04" onInspect={onInspect} /><button className="new-chat" onClick={onNew}><Plus size={16} /> New conversation</button><section className="drawer-section"><p>Conversations</p><button className="tree-row selected"><Bot size={16} /><span>New engineering chat</span></button></section></div><section className="drawer-section technical-region" data-ito-section="05"><TechLabel id="05" onInspect={onInspect} /><p>Project</p><button className="tree-row"><ChevronRight size={14} /><FolderTree size={16} /><span>codexsun</span></button><button className="tree-row nested"><FileCode2 size={16} /><span>Control plane</span></button><button className="tree-row nested"><Activity size={16} /><span>Agent runs</span></button></section><div className="drawer-footer"><span className="status-dot" />Local workspace<small>OS 0.1.0</small></div></aside>;
}

function RightDock({ onInspect, onToggle }: { onInspect: (id: TechnicalSectionId) => void; onToggle: () => void }) {
  return <aside className="icon-dock right-dock technical-region" data-ito-section="12" aria-label="Context tools"><TechLabel id="12" onInspect={onInspect} /><div className="dock-tools"><DockButton active icon={Activity} label="Run activity" onClick={onToggle} /><DockButton icon={SlidersHorizontal} label="Properties" onClick={onToggle} /><DockButton icon={ListTree} label="Outline" onClick={onToggle} /><DockButton icon={History} label="History" onClick={onToggle} /></div><div className="dock-bottom"><DockButton icon={Bell} label="Notifications" /></div></aside>;
}

function TopologyInspectionControl({ onClick, open }: { onClick: () => void; open: boolean }) {
  const action = open ? "Close Interface Topology Overlay" : "Open Interface Topology Overlay";
  return <button aria-label={action} className={open ? "topology-inspection-control open" : "topology-inspection-control"} onClick={onClick} title={`Topology Inspection: ${action}`}><Tags size={18} /><span>ITO</span></button>;
}

function WorkspaceDrawerToggle({ onToggle, open }: { onToggle: () => void; open: boolean }) {
  const action = open ? "Collapse workspace drawer" : "Expand workspace drawer";
  const Icon = open ? PanelLeftClose : PanelLeftOpen;
  return <button aria-label={action} className="workspace-drawer-toggle" onClick={onToggle} title={`${action} (Ctrl+B)`}><Icon size={16} /></button>;
}

function DockButton({ active = false, icon: Icon, label, onClick }: { active?: boolean; icon: typeof Bot; label: string; onClick?: () => void }) {
  return <button aria-label={label} className={active ? "dock-button active" : "dock-button"} onClick={onClick} title={label}><Icon size={19} /></button>;
}

function DrawerHeading({ label, onClose, side }: { label: string; onClose?: () => void; side: "left" | "right" }) {
  const Icon = side === "left" ? PanelLeftClose : PanelRightClose;
  return <header className="drawer-heading"><strong>{label}</strong>{onClose && <button aria-label={`Close ${label.toLowerCase()}`} onClick={onClose}><Icon size={16} /></button>}</header>;
}

function Welcome({ onInspect, onSelect }: { onInspect: (id: TechnicalSectionId) => void; onSelect: (prompt: string) => void }) {
  return <div className="welcome"><div className="welcome-mark"><Sparkles size={23} /></div><p className="eyebrow">Engineering conversation</p><h1>What should we understand next?</h1><p>Talk to Codex inside the active repository. This first mode can inspect, reason, and plan without changing files.</p><div className="starters technical-region" data-ito-section="09"><TechLabel id="09" onInspect={onInspect} />{starters.map((starter) => <button key={starter} onClick={() => onSelect(starter)}>{starter}<Send size={14} /></button>)}</div></div>;
}

function MessageBubble({ message }: { message: Message }) {
  return <article className={message.role === "user" ? "user-message" : "assistant-message"}><div className="message-author">{message.role === "user" ? "You" : <><Sparkles size={15} /> Codex</>}</div><div className="message-content">{message.content.split("\n").map((line, index) => line ? <p key={`${index}-${line.slice(0, 12)}`}>{line}</p> : <br key={index} />)}</div></article>;
}

function Composer({ input, isSending, onChange, onInspect, onSubmit }: { input: string; isSending: boolean; onChange: (value: string) => void; onInspect: (id: TechnicalSectionId) => void; onSubmit: () => void }) {
  function keyDown(event: KeyboardEvent<HTMLTextAreaElement>) { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); onSubmit(); } }
  function submit(event: FormEvent) { event.preventDefault(); onSubmit(); }
  return <div className="composer-wrap technical-region" data-ito-section="10"><TechLabel id="10" onInspect={onInspect} /><form className="composer" onSubmit={submit}><textarea aria-label="Message Codex" onChange={(event) => onChange(event.target.value)} onKeyDown={keyDown} placeholder="Ask about this repository…" rows={1} value={input} /><div className="composer-footer"><span><Command size={14} /> Enter to send · Shift Enter for a new line</span><button aria-label="Send message" disabled={!input.trim() || isSending} type="submit"><Send size={16} /></button></div></form><p className="composer-note">Review plans and activity before enabling write access.</p></div>;
}

function RunPanel({ message, onClose, onInspect }: { message?: Message; onClose: () => void; onInspect: (id: TechnicalSectionId) => void }) {
  return <aside className="run-panel technical-region" data-ito-section="11"><TechLabel id="11" onInspect={onInspect} /><DrawerHeading label="Properties" onClose={onClose} side="right" /><div className="run-heading"><div><p>Latest run</p><h2>Activity</h2></div></div>{!message ? <div className="empty-run"><Terminal size={20} /><p>Tool calls and execution summaries will appear here after the first response.</p></div> : <><div className="run-state"><span><Check size={14} /></span><div><strong>Turn completed</strong><small>{message.activities?.length ?? 0} recorded activities</small></div></div><div className="activity-list">{message.activities?.map((item) => <ActivityRow activity={item} key={item.id} />)}</div>{message.usage && <div className="usage"><span>Input <strong>{message.usage.inputTokens.toLocaleString()}</strong></span><span>Output <strong>{message.usage.outputTokens.toLocaleString()}</strong></span><span>Cached <strong>{message.usage.cachedInputTokens.toLocaleString()}</strong></span></div>}</>}</aside>;
}

function TechLabel({ id, onInspect }: { id: TechnicalSectionId; onInspect: (id: TechnicalSectionId) => void }) {
  const section = technicalSections.find((item) => item.id === id)!;
  function inspectAndCopy() {
    void navigator.clipboard.writeText(section.name).catch(() => undefined);
    onInspect(id);
  }

  return <button aria-label={`Copy and inspect ${section.name}`} className="technical-label" onClick={inspectAndCopy} title={`ITO ${id} · ${section.name} · Click to copy name`}>{id}</button>;
}

function TechnicalInspector({ highlighted, labelsVisible, onClose, onSelect, onToggleHighlight, onToggleLabels, selected }: { highlighted: boolean; labelsVisible: boolean; onClose: () => void; onSelect: (id: TechnicalSectionId) => void; onToggleHighlight: () => void; onToggleLabels: () => void; selected: TechnicalSectionId }) {
  const active = technicalSections.find((item) => item.id === selected)!;
  const highlightAction = highlighted ? "Hide section boundaries" : "Show section boundaries";
  const labelAction = labelsVisible ? "Hide ITO number cards" : "Show ITO number cards";
  const LabelsIcon = labelsVisible ? Eye : EyeOff;
  return <aside className="technical-inspector" aria-label="Interface Topology Overlay inspector"><header><div><span>Interface Topology Overlay</span></div><div className="inspector-actions"><button aria-label={labelAction} aria-pressed={labelsVisible} className={labelsVisible ? "ito-labels-toggle active" : "ito-labels-toggle"} onClick={onToggleLabels} title={labelAction}><LabelsIcon size={16} /></button><button aria-label={highlightAction} aria-pressed={highlighted} className={highlighted ? "boundary-highlight-toggle active" : "boundary-highlight-toggle"} onClick={onToggleHighlight} title={`${highlightAction}. The overlay closes so the boundaries are visible.`}><Highlighter size={16} /><span>Highlight</span></button><button aria-label="Close Interface Topology Overlay" onClick={onClose}><X size={17} /></button></div></header><div className="inspector-detail"><span>{active.scope}</span><p>{active.description}</p></div><nav>{technicalSections.map((section) => <button aria-current={section.id === selected ? "true" : undefined} className={section.id === selected ? "selected" : ""} key={section.id} onClick={() => onSelect(section.id)}><b>{section.id}</b><span>{section.name}</span>{section.id === selected && <Check className="selected-check" size={17} />}</button>)}</nav></aside>;
}

function ActivityRow({ activity }: { activity: ChatActivity }) {
  const Icon = activity.kind === "command" ? Terminal : activity.kind === "file" ? FileCode2 : activity.kind === "search" ? Search : activity.kind === "error" ? X : Wrench;
  return <div className="activity-row"><span className={`activity-icon ${activity.status}`}><Icon size={14} /></span><div><strong>{activity.kind}</strong><p>{activity.label}</p></div></div>;
}

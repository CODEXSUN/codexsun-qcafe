import type { ChatActivity, ChatTurnResponse } from "@codexsun/contracts";
import { InterfaceTopologyDrawer, type InterfaceTopologyController, TopologyInspectionControl, TopologyMarker, useInterfaceTopologyOverlay } from "@codexsun/devkit-ito";
import { Activity, Bell, Bot, Box, Check, ChevronDown, ChevronRight, Circle, Command, Database, Eye, FileCode2, FolderKanban, FolderTree, GitBranch, HelpCircle, History, Layers3, ListTree, Menu, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelsTopLeft, Play, Plus, Search, Send, Settings2, SlidersHorizontal, Sparkles, Terminal, Wrench, X } from "lucide-react";
import { type FormEvent, type KeyboardEvent, useEffect, useMemo, useState } from "react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { controlPlaneTopology } from "./control-plane-topology";

const apiUrl = import.meta.env.VITE_OS_API_URL ?? "http://127.0.0.1:4100";
type Message = { activities?: ChatActivity[]; content: string; id: string; role: "assistant" | "user"; usage?: ChatTurnResponse["usage"] };
const starters = ["Give me a concise architecture tour of this repository.", "Find the highest-risk gap in the current control plane.", "Plan the next safe vertical slice without changing files."];

export function App() {
  const [conversationId, setConversationId] = useState<string>();
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [leftOpen, setLeftOpen] = useState(true);
  const [menuOpen, setMenuOpen] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [rightOpen, setRightOpen] = useState(true);
  const topology = useInterfaceTopologyOverlay(controlPlaneTopology);
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
  return <div className="app-shell" {...topology.rootAttributes} data-left-open={leftOpen} data-menu-open={menuOpen} data-right-open={rightOpen}>
    <CommonTopMenu open={menuOpen} onToggle={() => setMenuOpen((open) => !open)} topology={topology} />
    <LeftDock onNew={reset} onToggle={() => setLeftOpen((open) => !open)} topology={topology} />
    <ResizablePanelGroup orientation="horizontal" className="workspace-panels">
      {leftOpen && <>
        <ResizablePanel defaultSize="24%" minSize="200px" maxSize="380px"><NavigationDrawer onNew={reset} topology={topology} /></ResizablePanel>
        <ResizableHandle className="ito-resizable-boundary ito-region" {...topology.regionProps("06")} withHandle><TopologyMarker id="06" topology={topology} /></ResizableHandle>
      </>}
      <ResizablePanel defaultSize={leftOpen ? "76%" : "100%"} minSize="420px">
        <main className="chat-workspace">
          <WorkspaceDrawerToggle open={leftOpen} onToggle={() => setLeftOpen((open) => !open)} />
          <header className="topbar ito-region" {...topology.regionProps("07")}><TopologyMarker id="07" topology={topology} /><div className="model-label"><span className="status-dot" /><strong>Codex sidecar</strong><ChevronDown size={14} /></div><div className="safety-label"><Circle size={8} fill="currentColor" /> Read-only workspace</div></header>
          <section className="conversation ito-region" {...topology.regionProps("08")} aria-live="polite">
            <TopologyMarker id="08" topology={topology} />{messages.length === 0 ? <Welcome onSelect={(prompt) => void submit(prompt)} topology={topology} /> : messages.map((message) => <MessageBubble key={message.id} message={message} />)}
            {isSending && <div className="assistant-message thinking"><Sparkles size={17} /><span>Codex is working through the repository…</span></div>}
          </section>
          <Composer input={input} isSending={isSending} onChange={setInput} onSubmit={() => void submit()} topology={topology} />
        </main>
      </ResizablePanel>
    </ResizablePanelGroup>
    <RunPanel message={latestRun} onClose={() => setRightOpen(false)} topology={topology} />
    <RightDock onToggle={() => setRightOpen((open) => !open)} topology={topology} />
    <TopologyInspectionControl topology={topology} />
    <InterfaceTopologyDrawer topology={topology} />
  </div>;
}

function CommonTopMenu({ onToggle, open, topology }: { onToggle: () => void; open: boolean; topology: InterfaceTopologyController }) {
  return <header className="common-top-menu ito-region" {...topology.regionProps("01")}><TopologyMarker id="01" topology={topology} /><button aria-label={open ? "Collapse main menu" : "Expand main menu"} className="menu-toggle" onClick={onToggle} title="Toggle main menu"><Menu size={18} /></button><div className="top-product"><span>CODEXSUN OS</span><small>Engineering workspace</small></div>{open && <nav aria-label="Application menu"><TopMenuButton icon={PanelsTopLeft} label="Workspace" /><TopMenuButton icon={FolderKanban} label="Project" /><TopMenuButton icon={Bot} label="Agents" /><TopMenuButton icon={Eye} label="View" /><TopMenuButton icon={Play} label="Run" /><TopMenuButton icon={HelpCircle} label="Help" /></nav>}<div className="top-actions"><span><GitBranch size={14} /> main</span><button aria-label="Run workspace" title="Run workspace"><Play size={15} /></button><button aria-label="Help" title="Help"><HelpCircle size={16} /></button></div></header>;
}

function TopMenuButton({ icon: Icon, label }: { icon: typeof Bot; label: string }) {
  return <button aria-label={label} title={label}><Icon size={16} /></button>;
}

function LeftDock({ onNew, onToggle, topology }: { onNew: () => void; onToggle: () => void; topology: InterfaceTopologyController }) {
  return <aside className="icon-dock left-dock ito-region" {...topology.regionProps("02")} aria-label="Primary tools"><TopologyMarker id="02" topology={topology} /><div className="dock-logo" title="CODEXSUN OS"><Box size={19} /></div><div className="dock-tools"><DockButton active icon={Bot} label="Chat" onClick={onToggle} /><DockButton icon={FolderTree} label="Explorer" onClick={onToggle} /><DockButton icon={GitBranch} label="Source control" onClick={onToggle} /><DockButton icon={Layers3} label="Applications" onClick={onToggle} /><DockButton icon={Database} label="Data" onClick={onToggle} /></div><div className="dock-bottom"><DockButton icon={Plus} label="New conversation" onClick={onNew} /><DockButton icon={Settings2} label="Settings" /></div></aside>;
}

function NavigationDrawer({ onNew, topology }: { onNew: () => void; topology: InterfaceTopologyController }) {
  return <aside className="navigation-drawer ito-region" {...topology.regionProps("03")}><TopologyMarker id="03" topology={topology} /><DrawerHeading label="Workspace" side="left" /><div className="ito-region" {...topology.regionProps("04")}><TopologyMarker id="04" topology={topology} /><button className="new-chat" onClick={onNew}><Plus size={16} /> New conversation</button><section className="drawer-section"><p>Conversations</p><button className="tree-row selected"><Bot size={16} /><span>New engineering chat</span></button></section></div><section className="drawer-section ito-region" {...topology.regionProps("05")}><TopologyMarker id="05" topology={topology} /><p>Project</p><button className="tree-row"><ChevronRight size={14} /><FolderTree size={16} /><span>codexsun</span></button><button className="tree-row nested"><FileCode2 size={16} /><span>Control plane</span></button><button className="tree-row nested"><Activity size={16} /><span>Agent runs</span></button></section><div className="drawer-footer"><span className="status-dot" />Local workspace<small>OS 0.1.0</small></div></aside>;
}

function RightDock({ onToggle, topology }: { onToggle: () => void; topology: InterfaceTopologyController }) {
  return <aside className="icon-dock right-dock ito-region" {...topology.regionProps("12")} aria-label="Context tools"><TopologyMarker id="12" topology={topology} /><div className="dock-tools"><DockButton active icon={Activity} label="Run activity" onClick={onToggle} /><DockButton icon={SlidersHorizontal} label="Properties" onClick={onToggle} /><DockButton icon={ListTree} label="Outline" onClick={onToggle} /><DockButton icon={History} label="History" onClick={onToggle} /></div><div className="dock-bottom"><DockButton icon={Bell} label="Notifications" /></div></aside>;
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

function Welcome({ onSelect, topology }: { onSelect: (prompt: string) => void; topology: InterfaceTopologyController }) {
  return <div className="welcome"><div className="welcome-mark"><Sparkles size={23} /></div><p className="eyebrow">Engineering conversation</p><h1>What should we understand next?</h1><p>Talk to Codex inside the active repository. This first mode can inspect, reason, and plan without changing files.</p><div className="starters ito-region" {...topology.regionProps("09")}><TopologyMarker id="09" topology={topology} />{starters.map((starter) => <button key={starter} onClick={() => onSelect(starter)}>{starter}<Send size={14} /></button>)}</div></div>;
}

function MessageBubble({ message }: { message: Message }) {
  return <article className={message.role === "user" ? "user-message" : "assistant-message"}><div className="message-author">{message.role === "user" ? "You" : <><Sparkles size={15} /> Codex</>}</div><div className="message-content">{message.content.split("\n").map((line, index) => line ? <p key={`${index}-${line.slice(0, 12)}`}>{line}</p> : <br key={index} />)}</div></article>;
}

function Composer({ input, isSending, onChange, onSubmit, topology }: { input: string; isSending: boolean; onChange: (value: string) => void; onSubmit: () => void; topology: InterfaceTopologyController }) {
  function keyDown(event: KeyboardEvent<HTMLTextAreaElement>) { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); onSubmit(); } }
  function submit(event: FormEvent) { event.preventDefault(); onSubmit(); }
  return <div className="composer-wrap ito-region" {...topology.regionProps("10")}><TopologyMarker id="10" topology={topology} /><form className="composer" onSubmit={submit}><textarea aria-label="Message Codex" onChange={(event) => onChange(event.target.value)} onKeyDown={keyDown} placeholder="Ask about this repository…" rows={1} value={input} /><div className="composer-footer"><span><Command size={14} /> Enter to send · Shift Enter for a new line</span><button aria-label="Send message" disabled={!input.trim() || isSending} type="submit"><Send size={16} /></button></div></form><p className="composer-note">Review plans and activity before enabling write access.</p></div>;
}

function RunPanel({ message, onClose, topology }: { message?: Message; onClose: () => void; topology: InterfaceTopologyController }) {
  return <aside className="run-panel ito-region" {...topology.regionProps("11")}><TopologyMarker id="11" topology={topology} /><DrawerHeading label="Properties" onClose={onClose} side="right" /><div className="run-heading"><div><p>Latest run</p><h2>Activity</h2></div></div>{!message ? <div className="empty-run"><Terminal size={20} /><p>Tool calls and execution summaries will appear here after the first response.</p></div> : <><div className="run-state"><span><Check size={14} /></span><div><strong>Turn completed</strong><small>{message.activities?.length ?? 0} recorded activities</small></div></div><div className="activity-list">{message.activities?.map((item) => <ActivityRow activity={item} key={item.id} />)}</div>{message.usage && <div className="usage"><span>Input <strong>{message.usage.inputTokens.toLocaleString()}</strong></span><span>Output <strong>{message.usage.outputTokens.toLocaleString()}</strong></span><span>Cached <strong>{message.usage.cachedInputTokens.toLocaleString()}</strong></span></div>}</>}</aside>;
}

function ActivityRow({ activity }: { activity: ChatActivity }) {
  const Icon = activity.kind === "command" ? Terminal : activity.kind === "file" ? FileCode2 : activity.kind === "search" ? Search : activity.kind === "error" ? X : Wrench;
  return <div className="activity-row"><span className={`activity-icon ${activity.status}`}><Icon size={14} /></span><div><strong>{activity.kind}</strong><p>{activity.label}</p></div></div>;
}

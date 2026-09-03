import type { AgentSummary, AgentTurn } from "@codexsun/zetro-api/contracts";
import { InterfaceTopologyDrawer, type InterfaceTopologyController, TopologyInspectionControl, TopologyMarker, useInterfaceTopologyOverlay } from "@codexsun/devkit-ito";
import { Activity, Bell, Bot, Box, Check, ChevronDown, ChevronRight, Circle, Command, Database, Eye, FileCode2, FolderKanban, FolderTree, GitBranch, HelpCircle, History, Layers3, ListTree, Menu, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelsTopLeft, Play, Plus, Search, Send, Settings2, SlidersHorizontal, Sparkles, Terminal, Wrench, X } from "lucide-react";
import { type FormEvent, type KeyboardEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "./components/resizable.js";
import { zetroTopology } from "./topology.js";

const apiUrl = import.meta.env.VITE_ZETRO_API_URL ?? "";
type Message = { activities?: AgentTurn["activities"]; content: string; id: string; role: "assistant" | "user"; usage?: AgentTurn["usage"] };
type WorkspaceView = "chat" | "settings";
type SettingsPageId = "developer" | "general";
const starters = ["Create a focused brief for this request.", "Review this draft against your specialist skills.", "Suggest the next three practical steps."];

export function ZetroWorkspace() {
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [agentId, setAgentId] = useState("");
  const [conversationId, setConversationId] = useState<string>();
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [leftOpen, setLeftOpen] = useState(true);
  const [menuOpen, setMenuOpen] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [rightOpen, setRightOpen] = useState(true);
  const [settingsPage, setSettingsPage] = useState<SettingsPageId>("general");
  const [view, setView] = useState<WorkspaceView>("chat");
  const topology = useInterfaceTopologyOverlay(zetroTopology);
  const latestRun = useMemo(() => [...messages].reverse().find((message) => message.activities?.length), [messages]);

  useEffect(() => {
    void fetch(`${apiUrl}/api/v1/zetro/agents`).then(async (response) => {
      if (!response.ok) throw new Error("Zetro is unavailable.");
      return response.json() as Promise<AgentSummary[]>;
    }).then((items) => { setAgents(items); setAgentId((current) => current || items[0]?.id || ""); }).catch(() => setAgents([]));
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
    if (!cleanMessage || !agentId || isSending) return;
    setMessages((current) => [...current, { content: cleanMessage, id: crypto.randomUUID(), role: "user" }]);
    setInput("");
    setIsSending(true);
    try {
      const response = await fetch(`${apiUrl}/api/v1/zetro/messages`, { body: JSON.stringify({ agentId, conversationId, message: cleanMessage }), headers: { "content-type": "application/json" }, method: "POST" });
      const body = await response.json() as AgentTurn | { error: string };
      if (!response.ok || "error" in body) throw new Error("error" in body ? body.error : `API returned ${response.status}.`);
      setConversationId(body.conversationId);
      setMessages((current) => [...current, { activities: body.activities, content: body.message, id: body.runId, role: "assistant", usage: body.usage }]);
    } catch (error) {
      setMessages((current) => [...current, { content: error instanceof Error ? error.message : "The selected agent is unavailable.", id: crypto.randomUUID(), role: "assistant" }]);
    } finally { setIsSending(false); }
  }

  function reset() { setConversationId(undefined); setMessages([]); setInput(""); setView("chat"); }
  function openSettings() { setView("settings"); setLeftOpen(true); }
  return <div className="app-shell" {...topology.rootAttributes} data-left-open={leftOpen} data-menu-open={menuOpen} data-right-open={rightOpen}>
    <CommonTopMenu open={menuOpen} onToggle={() => setMenuOpen((open) => !open)} topology={topology} />
    <LeftDock onNew={reset} onSettings={openSettings} onToggle={() => setLeftOpen((open) => !open)} topology={topology} />
    <ResizablePanelGroup orientation="horizontal" className="workspace-panels">
      {leftOpen && <>
        <ResizablePanel defaultSize="24%" minSize="200px" maxSize="380px"><NavigationDrawer onNew={reset} onSettingsPage={setSettingsPage} settingsPage={settingsPage} topology={topology} view={view} /></ResizablePanel>
        <ResizableHandle className="ito-resizable-boundary ito-region" {...topology.regionProps("06")} withHandle><TopologyMarker id="06" topology={topology} /></ResizableHandle>
      </>}
      <ResizablePanel defaultSize={leftOpen ? "76%" : "100%"} minSize="420px">
        <main className="chat-workspace">
          <WorkspaceDrawerToggle open={leftOpen} onToggle={() => setLeftOpen((open) => !open)} />
          <header className="topbar ito-region" {...topology.regionProps("07")}><TopologyMarker id="07" topology={topology} /><div className="model-label"><span className="status-dot" /><strong>{view === "settings" ? "Workspace settings" : agents.find((agent) => agent.id === agentId)?.name ?? "Select an agent"}</strong>{view === "chat" && <select aria-label="Select specialist agent" value={agentId} onChange={(event) => { setAgentId(event.target.value); reset(); }}><option value="">Select agent</option>{agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}{agent.configured ? "" : " (setup needed)"}</option>)}</select>}</div><div className="safety-label"><Circle size={8} fill="currentColor" /> {view === "settings" ? "Local preferences" : "Isolated specialist"}</div></header>
          {view === "settings" ? <SettingsPage page={settingsPage} topology={topology} /> : <><section className="conversation ito-region" {...topology.regionProps("08")} aria-live="polite">
            <TopologyMarker id="08" topology={topology} />{messages.length === 0 ? <Welcome onSelect={(prompt) => void submit(prompt)} topology={topology} /> : messages.map((message) => <MessageBubble key={message.id} message={message} />)}
            {isSending && <div className="assistant-message thinking"><Sparkles size={17} /><span>The specialist agent is working…</span></div>}
          </section><Composer input={input} isSending={isSending} onChange={setInput} onSubmit={() => void submit()} topology={topology} /></>}
        </main>
      </ResizablePanel>
    </ResizablePanelGroup>
    <RunPanel message={latestRun} onClose={() => setRightOpen(false)} topology={topology} />
    <RightDock onToggle={() => setRightOpen((open) => !open)} topology={topology} />
    <TopologyInspectionControl topology={topology} />
    <InterfaceTopologyDrawer topology={topology} />
    <div className="tweak-panel" aria-label="Layout tweak"><span>Layout</span><button className={rightOpen ? "active" : ""} onClick={() => setRightOpen(true)}>Context</button><button className={!rightOpen ? "active" : ""} onClick={() => setRightOpen(false)}>Focus</button></div>
  </div>;
}

function CommonTopMenu({ onToggle, open, topology }: { onToggle: () => void; open: boolean; topology: InterfaceTopologyController }) {
  return <header className="common-top-menu ito-region" {...topology.regionProps("01")}><TopologyMarker id="01" topology={topology} /><button aria-label={open ? "Collapse main menu" : "Expand main menu"} className="menu-toggle" onClick={onToggle} title="Toggle main menu"><Menu size={18} /></button><div className="top-product"><span>CODEXSUN OS</span><small>Engineering workspace</small></div>{open && <nav aria-label="Application menu"><TopMenuButton icon={PanelsTopLeft} label="Workspace" /><TopMenuButton icon={FolderKanban} label="Project" /><TopMenuButton icon={Bot} label="Agents" /><TopMenuButton icon={Eye} label="View" /><TopMenuButton icon={Play} label="Run" /><TopMenuButton icon={HelpCircle} label="Help" /></nav>}<div className="top-actions"><span><GitBranch size={14} /> main</span><button aria-label="Run workspace" title="Run workspace"><Play size={15} /></button><button aria-label="Help" title="Help"><HelpCircle size={16} /></button></div></header>;
}

function TopMenuButton({ icon: Icon, label }: { icon: typeof Bot; label: string }) {
  return <button aria-label={label} title={label}><Icon size={16} /></button>;
}

function LeftDock({ onNew, onSettings, onToggle, topology }: { onNew: () => void; onSettings: () => void; onToggle: () => void; topology: InterfaceTopologyController }) {
  return <aside className="icon-dock left-dock ito-region" {...topology.regionProps("02")} aria-label="Primary tools"><TopologyMarker id="02" topology={topology} /><div className="dock-logo" title="CODEXSUN OS"><Box size={19} /></div><div className="dock-tools"><DockButton active icon={Bot} label="Chat" onClick={onToggle} /><DockButton icon={FolderTree} label="Explorer" onClick={onToggle} /><DockButton icon={GitBranch} label="Source control" onClick={onToggle} /><DockButton icon={Layers3} label="Applications" onClick={onToggle} /><DockButton icon={Database} label="Data" onClick={onToggle} /></div><div className="dock-bottom"><DockButton icon={Plus} label="New conversation" onClick={onNew} /><DockButton icon={Settings2} label="Settings" onClick={onSettings} /></div></aside>;
}

function NavigationDrawer({ onNew, onSettingsPage, settingsPage, topology, view }: { onNew: () => void; onSettingsPage: (page: SettingsPageId) => void; settingsPage: SettingsPageId; topology: InterfaceTopologyController; view: WorkspaceView }) {
  const settings = view === "settings";
  return <aside className="navigation-drawer ito-region" {...topology.regionProps("03")}><TopologyMarker id="03" topology={topology} /><DrawerHeading label={settings ? "Settings" : "Workspace"} side="left" />{settings ? <SettingsNavigation onSelect={onSettingsPage} selected={settingsPage} topology={topology} /> : <><div className="ito-region" {...topology.regionProps("04")}><TopologyMarker id="04" topology={topology} /><button className="new-chat" onClick={onNew}><Plus size={16} /> New conversation</button><section className="drawer-section"><p>Conversations</p><button className="tree-row selected"><Bot size={16} /><span>New engineering chat</span></button></section></div><section className="drawer-section ito-region" {...topology.regionProps("05")}><TopologyMarker id="05" topology={topology} /><p>Project</p><button className="tree-row"><ChevronRight size={14} /><FolderTree size={16} /><span>codexsun</span></button><button className="tree-row nested"><FileCode2 size={16} /><span>Core</span></button><button className="tree-row nested"><Activity size={16} /><span>Agent runs</span></button></section></>}<div className="drawer-footer"><span className="status-dot" />Local workspace<small>OS 0.1.0</small></div></aside>;
}

function SettingsNavigation({ onSelect, selected, topology }: { onSelect: (page: SettingsPageId) => void; selected: SettingsPageId; topology: InterfaceTopologyController }) {
  return <div className="settings-navigation ito-region" {...topology.regionProps("04")}><TopologyMarker id="04" topology={topology} /><label><Search size={14} /><input aria-label="Search settings" placeholder="Search settings" /></label><section><p>Base</p><button className={selected === "general" ? "settings-link selected" : "settings-link"} onClick={() => onSelect("general")}><Settings2 size={16} />General</button></section><section className="ito-region" {...topology.regionProps("05")}><TopologyMarker id="05" topology={topology} /><p>Developer</p><button className={selected === "developer" ? "settings-link selected" : "settings-link"} onClick={() => onSelect("developer")}><Wrench size={16} />Developer</button></section></div>;
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
  return <div className="welcome"><div className="welcome-mark"><Sparkles size={23} /></div><p className="eyebrow">Zetro agent workspace</p><h1>What should your crew handle?</h1><p>Select an isolated specialist. Zetro sends your message to that agent and returns its answer.</p><div className="starters ito-region" {...topology.regionProps("09")}><TopologyMarker id="09" topology={topology} />{starters.map((starter) => <button key={starter} onClick={() => onSelect(starter)}>{starter}<Send size={14} /></button>)}</div></div>;
}

function SettingsPage({ page, topology }: { page: SettingsPageId; topology: InterfaceTopologyController }) {
  const [fullAccess, setFullAccess] = useState(false);
  const [suggestions, setSuggestions] = useState(true);
  return <section className="settings-page ito-region" {...topology.regionProps("08")}><TopologyMarker id="08" topology={topology} /><div className="settings-content"><p className="eyebrow">{page === "general" ? "Base settings" : "Developer settings"}</p><h1>{page === "general" ? "General" : "Developer"}</h1>{page === "general" ? <><SettingsGroup title="Permissions"><SettingRow detail="The default workspace mode is read-only." title="Default permissions"><span className="setting-value">Read-only</span></SettingRow><SettingRow detail="This future option requires an approved write-access workflow." title="Full access"><Switch checked={fullAccess} onChange={() => setFullAccess((value) => !value)} /></SettingRow></SettingsGroup><SettingsGroup title="Workspace"><SettingRow detail="The local directory used for projectless work." title="Projectless task folder"><button className="setting-button">Choose folder</button></SettingRow><SettingRow detail="The shell used by the integrated terminal." title="Integrated terminal shell"><button className="setting-select">PowerShell</button></SettingRow><SettingRow detail="The language used by this workspace." title="Language"><button className="setting-select">Auto detect</button></SettingRow></SettingsGroup></> : <><SettingsGroup title="Development"><SettingRow detail="Show the developer stack and ports in workspace diagnostics." title="Development stack"><span className="setting-value">API · Web · DevKit</span></SettingRow><SettingRow detail="Use the isolated provider for generated application code." title="Execution provider"><button className="setting-select">Required isolation</button></SettingRow><SettingRow detail="Run the shared port and database check before development startup." title="Startup preflight"><span className="setting-value">Enabled</span></SettingRow></SettingsGroup><SettingsGroup title="Assistant"><SettingRow detail="Show safe repository prompts in a new conversation." title="Suggested prompts"><Switch checked={suggestions} onChange={() => setSuggestions((value) => !value)} /></SettingRow><SettingRow detail="All durable refinements require a reviewer decision." title="Learning proposals"><span className="setting-value">Review required</span></SettingRow></SettingsGroup></>}</div></section>;
}

function SettingsGroup({ children, title }: { children: ReactNode; title: string }) {
  return <section className="settings-group"><h2>{title}</h2><div>{children}</div></section>;
}

function SettingRow({ children, detail, title }: { children: ReactNode; detail: string; title: string }) {
  return <div className="setting-row"><div><strong>{title}</strong><p>{detail}</p></div>{children}</div>;
}

function Switch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return <button aria-checked={checked} aria-label="Toggle setting" className={checked ? "setting-switch checked" : "setting-switch"} onClick={onChange} role="switch"><span /></button>;
}

function MessageBubble({ message }: { message: Message }) {
  return <article className={message.role === "user" ? "user-message" : "assistant-message"}><div className="message-author">{message.role === "user" ? "You" : <><Sparkles size={15} /> Zetro</>}</div><div className="message-content">{message.content.split("\n").map((line, index) => line ? <p key={`${index}-${line.slice(0, 12)}`}>{line}</p> : <br key={index} />)}</div></article>;
}

function Composer({ input, isSending, onChange, onSubmit, topology }: { input: string; isSending: boolean; onChange: (value: string) => void; onSubmit: () => void; topology: InterfaceTopologyController }) {
  function keyDown(event: KeyboardEvent<HTMLTextAreaElement>) { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); onSubmit(); } }
  function submit(event: FormEvent) { event.preventDefault(); onSubmit(); }
  return <div className="composer-wrap ito-region absolute inset-x-0 bottom-8 z-10 mx-auto w-[90%] max-w-[1180px] px-1" {...topology.regionProps("10")}><TopologyMarker id="10" topology={topology} /><form className="composer rounded-2xl border border-[#c8c7c0] bg-white p-4 shadow-[0_14px_36px_rgba(34,34,29,0.14)]" onSubmit={submit}><textarea aria-label="Message selected agent" className="min-h-14 w-full resize-none border-0 bg-transparent px-1 py-1 text-[#21211f] outline-none" onChange={(event) => onChange(event.target.value)} onKeyDown={keyDown} placeholder="Message the selected specialist…" rows={1} value={input} /><div className="composer-footer mt-1"><span><Command size={14} /> Enter to send · Shift Enter for a new line</span><button aria-label="Send message" disabled={!input.trim() || isSending} type="submit"><Send size={16} /></button></div></form><p className="composer-note mt-2">Each specialist uses its own duties, skills, memory, model, and container.</p></div>;
}

function RunPanel({ message, onClose, topology }: { message?: Message; onClose: () => void; topology: InterfaceTopologyController }) {
  return <aside className="run-panel ito-region" {...topology.regionProps("11")}><TopologyMarker id="11" topology={topology} /><DrawerHeading label="Properties" onClose={onClose} side="right" /><div className="run-heading"><div><p>Latest run</p><h2>Activity</h2></div></div>{!message ? <div className="empty-run"><Terminal size={20} /><p>Tool calls and execution summaries will appear here after the first response.</p></div> : <><div className="run-state"><span><Check size={14} /></span><div><strong>Turn completed</strong><small>{message.activities?.length ?? 0} recorded activities</small></div></div><div className="activity-list">{message.activities?.map((item) => <ActivityRow activity={item} key={item.id} />)}</div>{message.usage && <div className="usage"><span>Input <strong>{message.usage.inputTokens.toLocaleString()}</strong></span><span>Output <strong>{message.usage.outputTokens.toLocaleString()}</strong></span><span>Cached <strong>{message.usage.cachedInputTokens.toLocaleString()}</strong></span></div>}</>}</aside>;
}

function ActivityRow({ activity }: { activity: AgentTurn["activities"][number] }) {
  return <div className="activity-row"><span className={`activity-icon ${activity.status}`}><Wrench size={14} /></span><div><strong>{activity.kind}</strong><p>{activity.label}</p></div></div>;
}

import { Activity, Bell, Bot, Box, ChevronDown, Code2, FolderTree, GitBranch, Play, Search, Settings2, Terminal, Wrench } from "lucide-react";
import { useState } from "react";
import { InterfaceTopologyDrawer, type InterfaceTopologySection, TopologyInspectionControl, TopologyMarker } from "@codexsun/devkit-ito";
import { useInterfaceTopologyOverlay } from "@codexsun/devkit-ito/use-interface-topology-overlay";

const devKitTopology: InterfaceTopologySection[] = [
  { id: "01", technicalName: "devkit.commandBar.container", name: "DevKit command bar", scope: "Application chrome", description: "Global developer workspace navigation and branch actions." },
  { id: "02", technicalName: "devkit.navigation.primaryDock", name: "Primary developer dock", scope: "Navigation", description: "Compact access to developer workspace tools." },
  { id: "03", technicalName: "devkit.navigation.projectDrawer", name: "Project drawer", scope: "Navigation", description: "Project and developer-tool navigation." },
  { id: "04", technicalName: "devkit.projectDrawer.projectTree", name: "Project tree", scope: "Project drawer", description: "Repository source navigation for the active workspace." },
  { id: "05", technicalName: "devkit.projectDrawer.toolList", name: "Developer tool list", scope: "Project drawer", description: "Developer tools that do not belong to the core." },
  { id: "06", technicalName: "devkit.workspace.container", name: "Developer workspace", scope: "Workspace", description: "The active DevKit work surface." },
  { id: "07", technicalName: "devkit.workspace.sessionStatus", name: "Session status", scope: "Workspace", description: "Current developer session and safety mode." },
  { id: "08", technicalName: "devkit.workspace.canvas", name: "Workspace canvas", scope: "Workspace", description: "Developer context and active tool content." },
  { id: "09", technicalName: "devkit.canvas.developerActions", name: "Developer actions", scope: "Workspace canvas", description: "Quick developer actions for terminal, source, and agent runs." },
  { id: "10", technicalName: "devkit.workspace.footer", name: "Workspace footer", scope: "Workspace", description: "Current integration status for DevKit." },
  { id: "11", technicalName: "devkit.context.propertiesDrawer", name: "Properties drawer", scope: "Context", description: "Developer session properties and activity." },
  { id: "12", technicalName: "devkit.context.iconDock", name: "Context icon dock", scope: "Context", description: "Compact access to context and notification tools." },
];

export function App() {
  const [activeTool, setActiveTool] = useState("Workspace");
  const topology = useInterfaceTopologyOverlay(devKitTopology);
  return <div className="devkit-shell" {...topology.rootAttributes}>
    <header className="command-bar ito-region" {...topology.regionProps("01")}><TopologyMarker id="01" topology={topology} /><Box size={18} /><strong>DEVKIT</strong><span>Developer workspace</span><nav><button>Workspace</button><button>Project</button><button>Agents</button><button>Run</button></nav><div className="branch"><GitBranch size={14} /> main <Play size={14} /></div></header>
    <aside className="primary-dock ito-region" {...topology.regionProps("02")}><TopologyMarker id="02" topology={topology} /><button className="dock-active" title="Workspace"><Bot size={19} /></button><button title="Explorer"><FolderTree size={19} /></button><button title="Source control"><GitBranch size={19} /></button><button title="Tools"><Wrench size={19} /></button><button className="dock-bottom" title="Settings"><Settings2 size={19} /></button></aside>
    <aside className="project-drawer ito-region" {...topology.regionProps("03")}><TopologyMarker id="03" topology={topology} /><header><strong>WORKSPACE</strong><ChevronDown size={15} /></header><button className="project-search"><Search size={15} /> Search workspace</button><section className="ito-region" {...topology.regionProps("04")}><TopologyMarker id="04" topology={topology} /><p>PROJECT</p><button className="tree-row active"><FolderTree size={16} /> codexsun</button><button className="tree-row nested"><Code2 size={16} /> apps</button><button className="tree-row nested"><Code2 size={16} /> packages</button></section><section className="ito-region" {...topology.regionProps("05")}><TopologyMarker id="05" topology={topology} /><p>DEVELOPER TOOLS</p><button className="tree-row">{activeTool === "Workspace" && <span className="active-dot" />}Workspace</button><button className="tree-row" onClick={() => setActiveTool("Agent runs")}>Agent runs</button></section></aside>
    <main className="workspace ito-region" {...topology.regionProps("06")}><TopologyMarker id="06" topology={topology} /><header className="workspace-status ito-region" {...topology.regionProps("07")}><TopologyMarker id="07" topology={topology} /><span className="status-dot" /> Local developer session <span>Read-only workspace</span></header><section className="workspace-canvas ito-region" {...topology.regionProps("08")}><TopologyMarker id="08" topology={topology} /><div className="canvas-heading"><span>DEVELOPER WORKSPACE</span><h1>{activeTool}</h1><p>DevKit owns developer tools and keeps operational surfaces separate from the core.</p></div><div className="ito-region action-grid" {...topology.regionProps("09")}><TopologyMarker id="09" topology={topology} /><button><Terminal size={18} /> Open terminal</button><button><Code2 size={18} /> Inspect source</button><button><Activity size={18} /> Review agent run</button></div></section><footer className="workspace-footer ito-region" {...topology.regionProps("10")}><TopologyMarker id="10" topology={topology} />DevKit is ready for a public core integration.</footer></main>
    <aside className="context-dock ito-region" {...topology.regionProps("12")}><TopologyMarker id="12" topology={topology} /><button title="Activity"><Activity size={18} /></button><button title="Properties"><Settings2 size={18} /></button><button className="dock-bottom" title="Notifications"><Bell size={18} /></button></aside>
    <aside className="properties ito-region" {...topology.regionProps("11")}><TopologyMarker id="11" topology={topology} /><p>LATEST RUN</p><h2>Developer session</h2><span>No tool activity yet.</span></aside>
    <TopologyInspectionControl topology={topology} />
    <InterfaceTopologyDrawer topology={topology} />
  </div>;
}

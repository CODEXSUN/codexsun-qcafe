import { chatWorkspaceAddon, chatTopology } from "@codexsun/chat-web";
import { useCallback, useEffect, useState } from "react";
import { zetroPageTopology, zetroWorkspaceAddon } from "@codexsun/zetro-web";
import { InterfaceTopologyDrawer, TopologyInspectionControl, TopologyMarker } from "@codexsun/devkit-ito";
import { useInterfaceTopologyOverlay } from "@codexsun/devkit-ito/use-interface-topology-overlay";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@codexsun/ui/components/ui/select";
import { MainMdi, type MdiPage, type MdiTopologyAdapter } from "@codexsun/ui-desk";
import { coreTopology } from "./core-topology.js";
import { overviewPage, overviewWorkspace } from "./Overview.js";

export function App() {
  const [applications, setApplications] = useState<{ id: string; name: string; webUrl?: string }[]>([]);
  useEffect(() => { void fetch("/api/v1/core").then(response => { if (!response.ok) throw new Error("Application catalog unavailable"); return response.json(); }).then(snapshot => setApplications(snapshot.modules.filter((item: { kind: string; webUrl?: string }) => item.kind === "application" && item.webUrl && /^https?:\/\//.test(item.webUrl)))).catch(() => setApplications([])); }, []);
  const [page, setPage] = useState<MdiPage>(overviewPage);
  const [requestedPage, setRequestedPage] = useState<MdiPage>(overviewPage);
  const onPageChange = useCallback((next: MdiPage) => setPage(next), []);
  const sections = page.addonId === "zetro" ? zetroPageTopology(page.pageId ?? "chat")
    : page.addonId === "chat" ? chatTopology : [...coreTopology.filter(section => !/^5\.[0-9]+$/.test(section.id)), ...applications.map((app, index) => ({ id: `5.${index + 1}`, name: app.name, scope: "Application launcher", description: `Open ${app.name} in a new browser tab.` }))];
  const controller = useInterfaceTopologyOverlay(sections);
  const activePage = page.addonId === "zetro" ? "zetro-agent" : page.addonId === "chat" ? "chat" : "home";
  const pageSelector = <div className="grid gap-2 border-b border-border p-4 text-sm">
    <span className="font-medium text-foreground">Page</span>
    <Select value={activePage} onValueChange={(value) => {
      setRequestedPage(value === "home" ? { ...overviewPage } : { view: "workspace", addonId: value === "chat" ? "chat" : "zetro", pageId: value === "chat" ? "" : value.replace("zetro-", "") });
    }}>
      <SelectTrigger aria-label="Topology page" className="w-full cursor-pointer bg-background focus:ring-1 focus:ring-ring">
        <SelectValue placeholder="Select a page" />
      </SelectTrigger>
      <SelectContent className="ito-inspector-popover">
        <SelectItem className="cursor-pointer" value="home">Overview</SelectItem>
        <SelectItem className="cursor-pointer" value="chat">Chat</SelectItem>
        <SelectItem className="cursor-pointer" value="zetro-agent">Zetro agent</SelectItem>
      </SelectContent>
    </Select>
  </div>;
  const topology: MdiTopologyAdapter = {
    control: <TopologyInspectionControl placement="dock" topology={controller} />,
    drawer: <InterfaceTopologyDrawer pageSelector={pageSelector} topology={controller} />,
    marker: (id) => sections.some((section) => section.id === ownedId(id)) ? <TopologyMarker id={ownedId(id)} topology={controller} /> : null,
    regionProps: (id) => sections.some((section) => section.id === ownedId(id)) ? controller.regionProps(ownedId(id)) : { "data-ito-highlighted": "false", "data-ito-section": "" },
    rootAttributes: controller.rootAttributes,
  };
  function ownedId(id: string) {
    const prefix = page.addonId === "chat" ? "c" : page.addonId === "zetro" ? "z" : "";
    if (!prefix) return id;
    return ({ "11": `${prefix}2`, "11.1": `${prefix}2.1`, "12": `${prefix}2.2` } as Record<string, string>)[id] ?? id;
  }
  return <MainMdi applications={applications} addons={[overviewWorkspace, chatWorkspaceAddon, zetroWorkspaceAddon]} onPageChange={onPageChange} requestedPage={requestedPage} topology={topology} />;
}

import { chatWorkspaceAddon, chatTopology } from "@codexsun/chat-web";
import { aiTaskTopology, aiTaskWorkspaceAddon } from "@codexsun/ai-task-web";
import { useCallback, useEffect, useState } from "react";
import { zetroPageTopology, zetroWorkspaceAddon } from "@codexsun/zetro-web";
import { InterfaceTopologyDrawer, TopologyInspectionControl, TopologyMarker } from "@codexsun/devkit-ito";
import { useInterfaceTopologyOverlay } from "@codexsun/devkit-ito/use-interface-topology-overlay";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@codexsun/ui/components/ui/select";
import { clientSurfaceLabel, MainMdi, type MdiPage, type MdiTopologyAdapter } from "@codexsun/ui-desk";
import { coreTopology } from "./core-topology.js";
import { overviewPage, overviewWorkspace } from "./Overview.js";
import { createSettingsWorkspace } from "./Settings.js";
import { settingsTopology } from "./settings-topology.js";
import { platformFetch } from "@codexsun/platform-host-contracts";
import { useIdentitySession } from "@codexsun/identity-web";
import { createDocsWorkspaceAddon, docsTopology } from "@codexsun/docs-web";
import { createDeviceChatWorkspaceAddon, deviceChatTopology } from "@codexsun/dcs-web";
import { desktopCredentialStore } from "@codexsun/core-desktop";
import { platformWorkspace } from "./modules/access-management/index.js";
import { platformTopology } from "./platform-topology.js";
import { todosWorkspaceAddon } from "@codexsun/todos-web";
import { orshipWorkspaceAddon } from "@codexsun/orship-web";

declare const __CODEXSUN_VERSION__: string;

export function App() {
  const identity = useIdentitySession();
  const [applications, setApplications] = useState<{ id: string; name: string; webUrl?: string }[]>([]);
  useEffect(() => { void platformFetch("/api/v1/core").then(response => { if (!response.ok) throw new Error("Application catalog unavailable"); return response.json(); }).then(snapshot => setApplications(snapshot.modules.filter((item: { kind: string; webUrl?: string }) => item.kind === "application" && item.webUrl && /^https?:\/\//.test(item.webUrl)))).catch(() => setApplications([])); }, []);
  const [page, setPage] = useState<MdiPage>(overviewPage);
  const [requestedPage, setRequestedPage] = useState<MdiPage>(overviewPage);
  const onPageChange = useCallback((next: MdiPage) => setPage(next), []);
  const sections = page.addonId === "platform" ? platformTopology
    : page.addonId === "zetro" ? zetroPageTopology(page.pageId ?? "chat")
    : page.addonId === "ai-tasks" ? aiTaskTopology
    : page.addonId === "docs" ? docsTopology
    : page.addonId === "device-chat" ? deviceChatTopology
    : page.addonId === "settings" ? settingsTopology
    : page.addonId === "chat" ? chatTopology : [...coreTopology.filter(section => !/^5\.[0-9]+$/.test(section.id)), ...applications.map((app, index) => ({ id: `5.${index + 1}`, technicalName: `overview.applicationLauncher.application${index + 1}`, name: app.name, scope: "Application launcher", description: `Open ${app.name} in a new browser tab.` }))];
  const controller = useInterfaceTopologyOverlay(sections);
  const activePage = page.addonId === "platform" ? "platform" : page.addonId === "zetro" ? "zetro-agent" : page.addonId === "ai-tasks" ? "ai-tasks" : page.addonId === "orship" ? "orship" : page.addonId === "todos" ? "todos" : page.addonId === "docs" ? "docs" : page.addonId === "device-chat" ? "device-chat" : page.addonId === "settings" ? "settings" : page.addonId === "chat" ? "chat" : "home";
  const pageSelector = <div className="grid gap-2 border-b border-border p-4 text-sm">
    <span className="font-medium text-foreground">Page</span>
    <Select value={activePage} onValueChange={(value) => {
      setRequestedPage(value === "home" ? { ...overviewPage } : { view: "workspace", addonId: value === "platform" ? "platform" : value === "chat" ? "chat" : value === "ai-tasks" ? "ai-tasks" : value === "orship" ? "orship" : value === "settings" ? "settings" : value === "docs" ? "docs" : value === "device-chat" ? "device-chat" : value === "todos" ? "todos" : "zetro", pageId: value === "zetro-agent" ? "agent" : value === "settings" ? "applications" : value === "docs" ? "architecture" : "" });
    }}>
      <SelectTrigger aria-label="Topology page" className="w-full cursor-pointer bg-background focus:ring-1 focus:ring-ring">
        <SelectValue placeholder="Select a page" />
      </SelectTrigger>
      <SelectContent className="ito-inspector-popover">
        <SelectItem className="cursor-pointer" value="home">Overview</SelectItem>
        <SelectItem className="cursor-pointer" value="platform">Platform</SelectItem>
        <SelectItem className="cursor-pointer" value="chat">Chat</SelectItem>
        <SelectItem className="cursor-pointer" value="zetro-agent">Zetro agent</SelectItem>
        <SelectItem className="cursor-pointer" value="ai-tasks">Task System</SelectItem>
        <SelectItem className="cursor-pointer" value="orship">Orship</SelectItem>
        <SelectItem className="cursor-pointer" value="todos">Today</SelectItem>
        <SelectItem className="cursor-pointer" value="device-chat">Device chat</SelectItem>
        <SelectItem className="cursor-pointer" value="docs">Docs</SelectItem>
        <SelectItem className="cursor-pointer" value="settings">Settings</SelectItem>
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
    const prefix = page.addonId === "chat" ? "c" : page.addonId === "zetro" ? "z" : page.addonId === "ai-tasks" ? "t" : page.addonId === "settings" ? "s" : page.addonId === "docs" ? "d" : page.addonId === "device-chat" ? "dc" : "";
    if (!prefix) return id;
    return ({ "11": `${prefix}2`, "11.1": `${prefix}2.1`, "12": `${prefix}2.2` } as Record<string, string>)[id] ?? id;
  }
  const deskApplications = [{ id: "platform", name: "Platform", onOpen: () => setRequestedPage({ view: "workspace", addonId: "platform", pageId: "users" }) }, { id: "app.orship", name: "Orship", onOpen: () => setRequestedPage({ view: "workspace", addonId: "orship", pageId: "operations" }) }, ...applications];
  return <MainMdi applications={deskApplications} identity={{ login: identity.profile?.login, workspaceLabel: `${clientSurfaceLabel()} · ${identity.signedIn ? "Cloud workspace" : "Local workspace"}`, onManageProfile: () => setRequestedPage({ view: "workspace", addonId: "settings", pageId: "identity" }), onSignOut: identity.signedIn ? identity.signOut : undefined }} addons={[overviewWorkspace, platformWorkspace, chatWorkspaceAddon, zetroWorkspaceAddon, aiTaskWorkspaceAddon, orshipWorkspaceAddon, todosWorkspaceAddon, createDeviceChatWorkspaceAddon({ credentialStore: desktopCredentialStore("dcs-device") }), createDocsWorkspaceAddon(), createSettingsWorkspace(applications)]} onPageChange={onPageChange} requestedPage={requestedPage} topology={topology} version={__CODEXSUN_VERSION__} />;
}

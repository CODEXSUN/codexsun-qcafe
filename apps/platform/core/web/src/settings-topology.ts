import type { InterfaceTopologySection } from "@codexsun/devkit-ito";

export const settingsTopology: InterfaceTopologySection[] = [
  { id: "s6", technicalName: "settings.devices.panel", name: "Connected devices", scope: "Platform Settings", description: "Enroll this device, inspect its connection, and revoke access." },
  { id: "s7", technicalName: "settings.architecture.workspace", name: "Project Architecture & Structures", scope: "Architecture Settings", description: "Drill-down architectural registry for platform applications, modules, contracts, dependencies, and boundaries." },
  { id: "s9", technicalName: "settings.appearance.panel", name: "Appearance & Themes", scope: "Appearance Settings", description: "Configure workspace color scheme (White, Dark, System theme) and design system variants." },
  { id: "s1", technicalName: "settings.workspace.container", name: "Settings workspace", scope: "Platform Settings", description: "Host platform configuration pages." },
  { id: "s2", technicalName: "settings.sideCar.panel", name: "Settings side car", scope: "Platform Settings", description: "Navigate platform settings pages." },
  { id: "s2.1", technicalName: "settings.sideCar.content", name: "Settings navigation", scope: "Platform Settings", description: "List Applications, Appearance, Architecture, Connections, Identity, and Runtime pages." },
  { id: "s2.1.1", technicalName: "settings.sideCar.applicationsLink", name: "Applications settings link", scope: "Platform Settings", description: "Open registered application settings." },
  { id: "s2.1.2", technicalName: "settings.sideCar.appearanceLink", name: "Appearance settings link", scope: "Platform Settings", description: "Open appearance and theme settings." },
  { id: "s2.1.3", technicalName: "settings.sideCar.architectureLink", name: "Architecture settings link", scope: "Platform Settings", description: "Open project architecture and structures registry." },
  { id: "s2.1.4", technicalName: "settings.sideCar.connectionsLink", name: "Connections settings link", scope: "Platform Settings", description: "Open local module connection settings." },
  { id: "s2.1.5", technicalName: "settings.sideCar.identityLink", name: "Identity settings link", scope: "Platform Settings", description: "Open identity settings." },
  { id: "s2.1.6", technicalName: "settings.sideCar.runtimeLink", name: "Runtime settings link", scope: "Platform Settings", description: "Open runtime settings." },
  { id: "s2.2", technicalName: "settings.sideCar.railToggle", name: "Side car rail toggle", scope: "Platform Settings", description: "Collapse or expand settings navigation." },
  { id: "s3", technicalName: "settings.header.container", name: "Settings page header", scope: "Platform Settings", description: "Identify the active settings page." },
  { id: "s4", technicalName: "settings.applications.list", name: "Registered applications list", scope: "Applications Settings", description: "Show applications available to this Platform host." },
  { id: "s5", technicalName: "settings.connections.chat", name: "Chat connection settings", scope: "Connection Settings", description: "Generate a local Chat access token and connect the Chat workspace." },
  { id: "s8", technicalName: "settings.identity.panel", name: "Identity settings", scope: "Identity Settings", description: "Configure the active Platform identity and account preferences." },
];

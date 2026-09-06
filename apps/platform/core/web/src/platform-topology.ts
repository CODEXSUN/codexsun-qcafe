import type { InterfaceTopologySection } from "@codexsun/devkit-ito";

export const platformTopology: InterfaceTopologySection[] = [
  { id: "p1", technicalName: "platform.workspace.canvas", name: "Platform workspace", scope: "Workspace canvas", description: "Administrator workspace for accounts and access control." },
  { id: "p2", technicalName: "platform.sideCar.panel", name: "Platform side car", scope: "Workspace navigation", description: "Platform administration navigation." },
  { id: "p3", technicalName: "platform.access.header", name: "Access header", scope: "Users and access", description: "Page title and access-management introduction." },
  { id: "p3.1", technicalName: "platform.access.addUserButton", name: "Add user", scope: "Users and access", description: "Opens the account upsert dialog." },
  { id: "p4", technicalName: "platform.access.error", name: "Access error", scope: "Users and access", description: "Reports an authorization or account-loading issue." },
  { id: "p5", technicalName: "platform.access.accountList", name: "Account list", scope: "Users and access", description: "Lists users, roles, responsibilities, entitlements, status, and edit actions." },
];

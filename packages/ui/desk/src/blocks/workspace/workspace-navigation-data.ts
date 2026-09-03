import type { AppSidebarNavigation } from "@codexsun/ui/components/menu/sidemenu/app-sidebar";

export type WorkspaceNavigationView = "workspace";

export type WorkspaceContent = {
  description: string;
  details: string[];
  eyebrow: string;
  title: string;
};

const workspaceNavigationData: Record<WorkspaceNavigationView, AppSidebarNavigation> = {
  workspace: {
    id: "workspace",
    searchPlaceholder: "Search workspace...",
    groups: [
      {
        id: "workspace",
        title: "Workspace",
        defaultOpen: true,
        items: [
          { id: "canvas", title: "Main canvas", isActive: true },
          { id: "files", title: "Files" },
          { id: "activity", title: "Activity" },
        ],
      },
      {
        id: "tools",
        title: "Tools",
        items: [
          { id: "settings", title: "Settings" },
          { id: "connections", title: "Connections" },
        ],
      },
    ],
  },

};

const workspaceContentByItem: Record<string, WorkspaceContent> = {
  canvas: createWorkspaceContent("Workspace canvas", "A clear surface for the active application, with room for long-running work and its context."),
  files: createWorkspaceContent("Workspace files", "Browse the files and resources that belong to this workspace."),
  activity: createWorkspaceContent("Workspace activity", "Review recent activity without leaving the workspace surface."),
  settings: createWorkspaceContent("Workspace settings", "Configure workspace preferences and behavior."),
  connections: createWorkspaceContent("Workspace connections", "Manage connected tools and external services."),
};

export function getDefaultWorkspaceItem(view: WorkspaceNavigationView) {
  return workspaceNavigationData[view].groups.flatMap((group) => group.items).find((item) => item.isActive)?.id
    ?? workspaceNavigationData[view].groups[0]?.items[0]?.id
    ?? "";
}

export function getWorkspaceContent(itemId: string): WorkspaceContent {
  return workspaceContentByItem[itemId] ?? createWorkspaceContent("Workspace content", "Select a navigation item to load its content here.");
}

export function getWorkspaceNavigation(view: WorkspaceNavigationView, selectedItemId: string): AppSidebarNavigation {
  const navigation = workspaceNavigationData[view];

  return {
    ...navigation,
    groups: navigation.groups.map((group) => ({
      ...group,
      items: group.items.map((item) => ({ ...item, isActive: item.id === selectedItemId })),
    })),
  };
}

function createWorkspaceContent(title: string, description: string): WorkspaceContent {
  return {
    eyebrow: "Active workspace",
    title,
    description,
    details: [
      "The workspace content area grows with its active view and scrolls independently from navigation.",
      "The navigation remains available while you read or review long content.",
      "This content is supplied from the selected workspace item, not from the shared sidebar component.",
    ],
  };
}

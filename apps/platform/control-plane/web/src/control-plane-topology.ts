import type { InterfaceTopologySection } from "@codexsun/devkit-ito";

export const controlPlaneTopology: InterfaceTopologySection[] = [
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
  { id: "12", name: "Context icon dock", scope: "Context", description: "Compact access to activity, properties, outline, history, and topology inspection." },
];

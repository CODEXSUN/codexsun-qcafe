import type { InterfaceTopologySection } from "@codexsun/devkit-ito";

const zetroTopology: InterfaceTopologySection[] = [
  { id: "z1", technicalName: "zetro.workspace.container", name: "Zetro workspace", scope: "Zetro", description: "Prompts and responses from Zetro." },
  { id: "z2", technicalName: "zetro.sideCar.panel", name: "Zetro side car", scope: "Zetro", description: "Companion panel owned by Zetro." },
  { id: "z2.1", technicalName: "zetro.sideCar.content", name: "Side car content", scope: "Zetro", description: "Searchable chats grouped by date with a New Chat action." },
  { id: "z2.1.1", technicalName: "zetro.sideCar.searchInput", name: "Chat search input", scope: "Zetro", description: "Filter conversations and projects." },
  { id: "z2.1.2", technicalName: "zetro.sideCar.conversationGroups", name: "Conversation groups", scope: "Zetro", description: "Show pinned, project, add-on, unassigned, and archived conversations." },
  { id: "z2.1.3", technicalName: "zetro.sideCar.newChatButton", name: "New chat button", scope: "Zetro", description: "Start a new Zetro conversation." },
  { id: "z2.1.4", technicalName: "zetro.sideCar.projectDialog", name: "Create project dialog", scope: "Zetro", description: "Name and save a conversation project." },
  { id: "z2.2", technicalName: "zetro.sideCar.railToggle", name: "Side car rail toggle", scope: "Zetro", description: "Collapse or expand the companion panel." },
  { id: "z3", technicalName: "zetro.header.container", name: "Zetro header", scope: "Zetro", description: "Agent identity and workspace title." },
  { id: "z3.1", technicalName: "zetro.header.conversationTabs", name: "Parallel conversation tabs", scope: "Zetro", description: "Switch among open chats while their agent responses continue in parallel." },
  { id: "z4", technicalName: "zetro.history.container", name: "Response history", scope: "Zetro", description: "Welcome state and prompt-response exchanges." },
  { id: "z4.1", technicalName: "zetro.history.welcomeAndExchanges", name: "Welcome and response exchanges", scope: "Zetro", description: "Initial welcome or loaded prompt-response pairs." },
  { id: "z5", technicalName: "zetro.composer.form", name: "Prompt composer", scope: "Zetro", description: "Write and submit a prompt." },
  { id: "z5.1", technicalName: "zetro.composer.promptInput", name: "Prompt input", scope: "Zetro", description: "Enter a prompt for Zetro." },
  { id: "z5.2", technicalName: "zetro.composer.requestStatus", name: "Request status", scope: "Zetro", description: "Current request and provider status." },
  { id: "z5.3", technicalName: "zetro.composer.sendButton", name: "Send prompt", scope: "Zetro", description: "Submit the prompt to Zetro." },
  { id: "z5.4", technicalName: "zetro.composer.errorAlert", name: "Request error", scope: "Zetro", description: "Actionable feedback when a request fails." },
  { id: "z5.5", technicalName: "zetro.composer.agentFlow", name: "Agent flow options", scope: "Zetro", description: "Toggle tool evidence and response motion." },
  { id: "z4.4", technicalName: "zetro.chat.taskHandoff", name: "Task handoff controls", scope: "Zetro chat", description: "Review a prompt and discussion, send approved work to the AI Task System, and inspect returned evidence and metrics." },
  { id: "z5.6", technicalName: "zetro.composer.orchestration", name: "Orchestration control", scope: "Zetro", description: "Select Sequential or LangGraph execution and control approval gates from Agent flow." },
  { id: "z5.7", technicalName: "zetro.composer.steeredQueue", name: "Steered message queue", scope: "Zetro", description: "Hold follow-up messages until the operator selects the next message to send." },
];

export function zetroPageTopology(_page: string): InterfaceTopologySection[] {
  if (_page === "review") return [
    { id: "zr1", technicalName: "zetro.reviewLibrary.workspace", name: "Review Library workspace", scope: "Zetro review", description: "Combine prompts, agent results, and task evidence in one review space." },
    { id: "zr2", technicalName: "zetro.reviewLibrary.tabs", name: "Library tabs", scope: "Zetro review", description: "Filter all, prompts, results, tasks, or improvement evidence." },
    { id: "zr3", technicalName: "zetro.reviewLibrary.bulkActions", name: "Bulk review actions", scope: "Zetro review", description: "Consolidate, re-analyze, send tasks, or propose skill refinements from selected evidence." },
    { id: "zr4", technicalName: "zetro.reviewLibrary.list", name: "Review evidence list", scope: "Zetro review", description: "Select prompt, result, and task records for reviewed follow-up work." },
  ];
  return zetroTopology;
}

export const zetroProjectsTopology: InterfaceTopologySection[] = [
  { id: "zp1", technicalName: "zetro.projects.workspace", name: "Projects workspace", scope: "Zetro", description: "Connected Zetro project workspaces." },
  { id: "zp2", technicalName: "zetro.projects.sideCar", name: "Project side car", scope: "Zetro", description: "Quick project navigation and creation." },
  { id: "zp3", technicalName: "zetro.projects.roster", name: "Project roster", scope: "Zetro", description: "Persisted projects with their linked conversation count." },
  { id: "zp4", technicalName: "zetro.projects.detail", name: "Project detail", scope: "Zetro", description: "A selected project and its workspace tabs." },
  { id: "zp5", technicalName: "zetro.projects.detailContent", name: "Project detail content", scope: "Zetro", description: "Derived conversation, task, review, and context records." },
];

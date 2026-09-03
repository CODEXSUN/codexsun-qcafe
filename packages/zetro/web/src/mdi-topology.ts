import type { InterfaceTopologySection } from "@codexsun/devkit-ito";

const zetroTopology: InterfaceTopologySection[] = [
  { id: "z1", technicalName: "zetro.workspace.container", name: "Zetro workspace", scope: "Zetro", description: "Prompts and responses from Zetro." },
  { id: "z2", technicalName: "zetro.sideCar.panel", name: "Zetro side car", scope: "Zetro", description: "Companion panel owned by Zetro." },
  { id: "z2.1", technicalName: "zetro.sideCar.content", name: "Side car content", scope: "Zetro", description: "Searchable chats grouped by date with a New Chat action." },
  { id: "z2.2", technicalName: "zetro.sideCar.railToggle", name: "Side car rail toggle", scope: "Zetro", description: "Collapse or expand the companion panel." },
  { id: "z3", technicalName: "zetro.header.container", name: "Zetro header", scope: "Zetro", description: "Agent identity and workspace title." },
  { id: "z4", technicalName: "zetro.history.container", name: "Response history", scope: "Zetro", description: "Welcome state and prompt-response exchanges." },
  { id: "z4.1", technicalName: "zetro.history.welcomeAndExchanges", name: "Welcome and response exchanges", scope: "Zetro", description: "Initial welcome or loaded prompt-response pairs." },
  { id: "z5", technicalName: "zetro.composer.form", name: "Prompt composer", scope: "Zetro", description: "Write and submit a prompt." },
  { id: "z5.1", technicalName: "zetro.composer.promptInput", name: "Prompt input", scope: "Zetro", description: "Enter a prompt for Zetro." },
  { id: "z5.2", technicalName: "zetro.composer.requestStatus", name: "Request status", scope: "Zetro", description: "Current request and provider status." },
  { id: "z5.3", technicalName: "zetro.composer.sendButton", name: "Send prompt", scope: "Zetro", description: "Submit the prompt to Zetro." },
  { id: "z5.4", technicalName: "zetro.composer.errorAlert", name: "Request error", scope: "Zetro", description: "Actionable feedback when a request fails." },
  { id: "z5.5", technicalName: "zetro.composer.agentFlow", name: "Agent flow options", scope: "Zetro", description: "Toggle tool evidence and response motion." },
];

export function zetroPageTopology(_page: string): InterfaceTopologySection[] {
  return zetroTopology;
}

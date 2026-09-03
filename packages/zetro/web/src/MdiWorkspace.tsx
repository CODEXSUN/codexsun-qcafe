import type { MdiTopologyAdapter } from "@codexsun/ui-desk";
import { Bot } from "lucide-react";
import { PromptWorkspace } from "./PromptWorkspace.js";
import { ZetroQueryProvider } from "./query-provider.js";

export const zetroWorkspaceAddon = {
  id: "zetro", label: "Zetro", icon: Bot,
  navigation: { id: "zetro", hideSearch: true, groups: [] },
  renderPage: (_page: string, topology?: MdiTopologyAdapter, sideCarTarget?: HTMLElement | null) => <ZetroQueryProvider><PromptWorkspace topology={topology} sideCarTarget={sideCarTarget} /></ZetroQueryProvider>,
};

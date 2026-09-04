import { ClipboardList } from "lucide-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { MdiWorkspaceAddon } from "@codexsun/ui-desk";
import { TaskWorkspace } from "./TaskWorkspace.js";

const client = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } });
export const aiTaskWorkspaceAddon: MdiWorkspaceAddon = {
  id: "ai-tasks", label: "Task System", icon: ClipboardList,
  navigation: { id: "ai-tasks", hideSearch: true, groups: [] },
  renderPage: (pageId, topology, sideCarTarget) => <QueryClientProvider client={client}><TaskWorkspace pageId={pageId} topology={topology} sideCarTarget={sideCarTarget} /></QueryClientProvider>,
};
export { TaskWorkspace } from "./TaskWorkspace.js";
export { aiTaskTopology } from "./topology.js";

import { ClipboardList } from "lucide-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { MdiWorkspaceAddon } from "@codexsun/ui-desk";
import { Toaster } from "@codexsun/ui/components/ui/sonner";
import { TaskWorkspace } from "./TaskWorkspace.js";
import { platformAiTaskClient, type AiTaskClient } from "./api.js";

const client = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } });
export function createAiTaskWorkspaceAddon(options: { taskClient?: AiTaskClient } = {}): MdiWorkspaceAddon { return {
  id: "ai-tasks", label: "Task System", icon: ClipboardList,
  navigation: { id: "ai-tasks", hideSearch: true, groups: [] },
  renderPage: (pageId, topology, sideCarTarget) => <QueryClientProvider client={client}><Toaster closeButton position="bottom-right" richColors /><TaskWorkspace client={options.taskClient ?? platformAiTaskClient} pageId={pageId} topology={topology} sideCarTarget={sideCarTarget} /></QueryClientProvider>,
}; }
export const aiTaskWorkspaceAddon = createAiTaskWorkspaceAddon();
export { TaskWorkspace } from "./TaskWorkspace.js";
export { aiTaskTopology } from "./topology.js";
export { createAiTaskClient, platformAiTaskClient } from "./api.js";
export type { AiTaskClient, AiTaskTransport } from "./api.js";
export { AI_TASK_NAVIGATE_EVENT } from "@codexsun/ai-task-contracts";
export type { AiTaskNavigateDetail } from "@codexsun/ai-task-contracts";

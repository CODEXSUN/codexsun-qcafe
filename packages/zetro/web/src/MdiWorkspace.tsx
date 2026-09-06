import type { MdiTopologyAdapter } from "@codexsun/ui-desk";
import { Bot, FolderKanban } from "lucide-react";
import { PromptWorkspace } from "./PromptWorkspace.js";
import { ZetroQueryProvider } from "./query-provider.js";
import { ZetroPropertiesDrawer } from "./ZetroPropertiesDrawer.js";
import { ReviewLibraryPage } from "./ReviewLibraryPage.js";
import { ZetroProjectsWorkspace } from "./projects/ProjectWorkspace.js";
import { Toaster } from "@codexsun/ui/components/ui/sonner";

export const zetroWorkspaceAddon = {
  id: "zetro", label: "Zetro", icon: Bot,
  navigation: { id: "zetro", hideSearch: true, groups: [] },
  renderProperties: (open: boolean, onOpenChange: (open: boolean) => void) => <ZetroQueryProvider><ZetroPropertiesDrawer open={open} onOpenChange={onOpenChange} /></ZetroQueryProvider>,
  renderPage: (page: string, topology?: MdiTopologyAdapter, sideCarTarget?: HTMLElement | null) => <ZetroQueryProvider><Toaster closeButton position="bottom-right" richColors />{page === "review" ? <ReviewLibraryPage topology={topology} sideCarTarget={sideCarTarget} /> : <PromptWorkspace topology={topology} sideCarTarget={sideCarTarget} />}</ZetroQueryProvider>,
};

export const zetroProjectsWorkspaceAddon = {
  id: "zetro-projects", label: "Projects", icon: FolderKanban, placement: "primary" as const,
  navigation: { id: "zetro-projects", hideSearch: true, groups: [{ id: "projects", title: "Projects", defaultOpen: true, items: [{ id: "projects", title: "Projects" }] }] },
  renderPage: (_page: string, topology?: MdiTopologyAdapter, sideCarTarget?: HTMLElement | null) => <ZetroQueryProvider><Toaster closeButton position="bottom-right" richColors /><ZetroProjectsWorkspace topology={topology} sideCarTarget={sideCarTarget} /></ZetroQueryProvider>,
};

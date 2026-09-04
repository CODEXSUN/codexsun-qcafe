import type { MdiTopologyAdapter } from "@codexsun/ui-desk";
import { Bot } from "lucide-react";
import { PromptWorkspace } from "./PromptWorkspace.js";
import { ZetroQueryProvider } from "./query-provider.js";
import { ZetroPropertiesDrawer } from "./ZetroPropertiesDrawer.js";
import { ReviewLibraryPage } from "./ReviewLibraryPage.js";

export const zetroWorkspaceAddon = {
  id: "zetro", label: "Zetro", icon: Bot,
  navigation: { id: "zetro", hideSearch: true, groups: [] },
  renderProperties: (open: boolean, onOpenChange: (open: boolean) => void) => <ZetroQueryProvider><ZetroPropertiesDrawer open={open} onOpenChange={onOpenChange} /></ZetroQueryProvider>,
  renderPage: (page: string, topology?: MdiTopologyAdapter, sideCarTarget?: HTMLElement | null) => <ZetroQueryProvider>{page === "review" ? <ReviewLibraryPage topology={topology} sideCarTarget={sideCarTarget} /> : <PromptWorkspace topology={topology} sideCarTarget={sideCarTarget} />}</ZetroQueryProvider>,
};

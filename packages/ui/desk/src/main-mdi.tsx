import type { DeskApplication } from "./blocks/navigation/app-deck.js";
import { readPageUrl, writePageUrl } from "./blocks/workspace/page-url.js";
import type { LucideIcon } from "lucide-react";
import type { AppSidebarNavigation } from "@codexsun/ui/components/menu/sidemenu/app-sidebar";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { LeftIconDock } from "./blocks/navigation/left-icon-dock.js";
import { RightIconDock } from "./blocks/navigation/right-icon-dock.js";
import { TopIconBar } from "./blocks/navigation/top-icon-bar.js";
import type { MdiUserIdentity } from "./blocks/navigation/user-deck.js";
import type { MdiTopologyAdapter } from "./blocks/topology/mdi-topology.js";
import { MdiWorkspaceCanvas } from "./blocks/workspace/mdi-workspace-canvas.js";
import { WorkspaceContent } from "./blocks/workspace/workspace-content.js";
import { getDefaultWorkspaceItem, getWorkspaceContent, getWorkspaceNavigation, type WorkspaceNavigationView } from "./blocks/workspace/workspace-navigation-data.js";

export type MdiWorkspaceAddon = { id: string; label: string; icon: LucideIcon; navigation: AppSidebarNavigation; placement?: "primary" | "secondary" | "utility"; renderSideCar?: () => ReactNode; renderProperties?: (open: boolean, onOpenChange: (open: boolean) => void) => ReactNode; renderPage: (pageId: string, topology?: MdiTopologyAdapter, sideCarTarget?: HTMLElement | null) => ReactNode };

export type MdiPage = { view: WorkspaceNavigationView; addonId?: string; pageId?: string };

export function MainMdi({ applications, identity, topology, addons = [], requestedPage, onPageChange }: { applications?: DeskApplication[]; identity?: MdiUserIdentity; topology?: MdiTopologyAdapter; addons?: MdiWorkspaceAddon[]; requestedPage?: MdiPage; onPageChange?: (page: MdiPage) => void }) {
  const [sideCarTarget, setSideCarTarget] = useState<HTMLDivElement | null>(null);
  const fallback = requestedPage ?? { view: "workspace" as const, pageId: getDefaultWorkspaceItem("workspace") };
  const [page, setPage] = useState<MdiPage>(() => readPageUrl(new URL(window.location.href), fallback, addons.map((item) => item.id)));
  const { addonId, pageId: selectedItemId = "", view: workspaceView } = page;
  const addon = addons.find((item) => item.id === addonId);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [propertiesOpen, setPropertiesOpen] = useState(false);
  const previousRequest = useRef(requestedPage);
  const changePage = useCallback((next: MdiPage) => {
    const url = writePageUrl(new URL(window.location.href), next);
    if (url.href !== window.location.href) window.history.pushState(null, "", url);
    setPage(next);
  }, []);
  useEffect(() => {
    const url = writePageUrl(new URL(window.location.href), page);
    window.history.replaceState(null, "", url);
  }, []);
  useEffect(() => {
    const restore = () => setPage(readPageUrl(new URL(window.location.href), fallback, addons.map((item) => item.id)));
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, [addons, fallback]);
  useEffect(() => {
    if (requestedPage && previousRequest.current !== requestedPage) changePage(requestedPage);
    previousRequest.current = requestedPage;
  }, [requestedPage, changePage]);
  useEffect(() => { onPageChange?.(page); }, [page, onPageChange]);
  useEffect(() => { setPropertiesOpen(false); }, [addonId]);
  const toggleSidebar = useCallback(() => setSidebarOpen((open) => !open), []);
  const changeWorkspaceView = useCallback((view: WorkspaceNavigationView) => changePage({ view, pageId: getDefaultWorkspaceItem(view) }), [changePage]);
  return <main aria-label="Main MDI" className="grid h-screen w-screen grid-cols-[3rem_minmax(0,1fr)_3rem] grid-rows-[3.5rem_minmax(0,1fr)] bg-background text-foreground" {...topology?.rootAttributes}>
    <TopIconBar applications={applications} identity={identity} navigationOpen={sidebarOpen} onToggleNavigation={toggleSidebar} topology={topology} />
    <LeftIconDock addons={addons} selectedAddonId={addonId} onAddonSelect={(item) => { changePage({ view: "workspace", addonId: item.id, pageId: item.navigation.groups[0]?.items[0]?.id ?? "" }); }} onViewChange={changeWorkspaceView} selectedView={workspaceView} topology={topology} />
    <section className={topology ? "ito-region row-start-2 min-h-0 min-w-0 overflow-hidden bg-[#F7F7F4] dark:bg-background [&>.technical-label]:!left-1/2 [&>.technical-label]:!top-3 [&>.technical-label]:-translate-x-1/2" : "row-start-2 min-h-0 min-w-0 overflow-hidden bg-[#F7F7F4] dark:bg-background"} {...topology?.regionProps("08")}>
      {topology?.marker("08")}
      <div id="mdi.workspaceCanvas" data-mdi-workspace-canvas="true" className="h-full min-h-0 w-full">
        <MdiWorkspaceCanvas
          content={<WorkspaceContent content={getWorkspaceContent(selectedItemId)} />}
          page={<>{!addon && <WorkspaceContent content={getWorkspaceContent(selectedItemId)} />}{addons.map((item) => <div key={item.id} hidden={item.id !== addonId} className="h-full min-h-0">{item.renderPage(item.id === addonId ? selectedItemId : item.navigation.groups[0]?.items[0]?.id ?? "", item.id === addonId ? topology : undefined, item.id === addonId ? sideCarTarget : null)}</div>)}</>} navigation={addon ? { ...addon.navigation, groups: addon.navigation.groups.map((group) => ({ ...group, items: group.items.map((item) => ({ ...item, isActive: item.id === selectedItemId })) })) } : getWorkspaceNavigation(workspaceView, selectedItemId)}
          navigationContent={addon?.renderSideCar?.()}
          navigationActions={addon ? <div ref={setSideCarTarget} className="h-full min-h-0" /> : undefined}
          onItemSelect={(item) => changePage({ ...page, pageId: item.id })}
          onSidebarOpenChange={setSidebarOpen}
          sidebarOpen={sidebarOpen}
          topology={topology}
        />
      </div>
    </section>
    <RightIconDock propertiesOpen={propertiesOpen} onPropertiesClick={addon?.renderProperties ? () => setPropertiesOpen((open) => !open) : undefined} topology={topology} />
    {addon?.renderProperties?.(propertiesOpen, setPropertiesOpen)}
    {topology?.drawer}
  </main>;
}

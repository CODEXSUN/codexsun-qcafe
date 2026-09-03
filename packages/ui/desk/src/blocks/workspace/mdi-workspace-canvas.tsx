import { MdiSideCar } from "./mdi-side-car.js";
import type { CSSProperties, ReactNode } from "react";
import { type AppSidebarItem, type AppSidebarNavigation } from "@codexsun/ui/components/menu/sidemenu/app-sidebar";
import { SidebarInset, SidebarProvider } from "@codexsun/ui/components/sidebar";
import { MdiTopologyRegion, type MdiTopologyAdapter } from "../topology/mdi-topology.js";

type MdiWorkspaceCanvasProps = {
  content: ReactNode;
  navigationContent?: ReactNode;
  navigationActions?: ReactNode;
  navigation: AppSidebarNavigation;
  onItemSelect: (item: AppSidebarItem) => void;
  onSidebarOpenChange: (open: boolean) => void;
  page?: ReactNode;
  sidebarOpen: boolean;
  topology?: MdiTopologyAdapter;
};

export function MdiWorkspaceCanvas({ content, navigationActions, navigationContent, onSidebarOpenChange, page, sidebarOpen, topology }: MdiWorkspaceCanvasProps) {
  return (
    <SidebarProvider
      className="relative h-full !min-h-0 w-full overflow-hidden bg-muted/30"
      onOpenChange={onSidebarOpenChange}
      open={sidebarOpen}
      style={{ "--sidebar-width": "16rem" } as CSSProperties}
    >
      <MdiSideCar topology={topology}>{navigationContent ?? navigationActions}</MdiSideCar>
      <div className="absolute left-[calc(var(--sidebar-width)-2rem)] top-1 z-20">{topology?.marker("11")}</div>
      {topology && (
        <div
          className={`ito-region !absolute top-1/2 z-30 size-8 -translate-y-1/2 [&>.technical-label]:left-1/2 [&>.technical-label]:top-1/2 [&>.technical-label]:-translate-x-1/2 [&>.technical-label]:-translate-y-1/2 ${sidebarOpen ? "left-[calc(var(--sidebar-width)-1rem)]" : "left-1"}`}
          {...topology.regionProps("12")}
        >
          {topology.marker("12")}
        </div>
      )}
      <SidebarInset
        className="ito-region h-full min-h-0 overflow-hidden bg-background transition-[margin] duration-200 ease-linear [&>.technical-label]:!left-auto [&>.technical-label]:!right-3 [&>.technical-label]:!top-3"
        {...topology?.regionProps("13")}
      >
        {topology?.marker("13")}
        <div className="ito-region relative h-full min-h-0 w-full [&>.technical-label]:!left-auto [&>.technical-label]:!right-3 [&>.technical-label]:!top-10" {...topology?.regionProps("14")}>
          {topology?.marker("14")}
          {page ?? content}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

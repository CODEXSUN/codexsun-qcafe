import type { ReactNode } from "react";
import { Sidebar, SidebarContent, SidebarRail } from "@codexsun/ui/components/sidebar";
import { MdiTopologyRegion, type MdiTopologyAdapter } from "../topology/mdi-topology.js";

export function MdiSideCar({ children, topology }: { children?: ReactNode; topology?: MdiTopologyAdapter }) {
  return <Sidebar id="mdi.sideCar" aria-label="Application side car" className="!absolute !inset-y-0 !left-0 !h-full border-r border-border group-data-[collapsible=offcanvas]:!left-[-16rem]" {...topology?.regionProps("11")}>
    <SidebarContent className="min-h-0 overflow-auto p-3"><MdiTopologyRegion id="11.1" topology={topology} className="h-full min-h-0">{children}</MdiTopologyRegion></SidebarContent>
    <SidebarRail aria-label="Toggle side car" title="Toggle side car" {...topology?.regionProps("12")} />
  </Sidebar>;
}

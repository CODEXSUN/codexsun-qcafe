import type { MdiWorkspaceAddon } from "../../main-mdi.js";
import { BookOpen, Link, Settings } from "lucide-react";
import { IconDockButton } from "./icon-dock-button.js";
import { MdiTopologyRegion, type MdiTopologyAdapter } from "../topology/mdi-topology.js";
import type { WorkspaceNavigationView } from "../workspace/workspace-navigation-data.js";

type LeftIconDockProps = {
  addons: MdiWorkspaceAddon[];
  selectedAddonId?: string;
  onAddonSelect: (addon: MdiWorkspaceAddon) => void;
  onViewChange: (view: WorkspaceNavigationView) => void;
  selectedView: WorkspaceNavigationView;
  topology?: MdiTopologyAdapter;
};

export function LeftIconDock({ addons, selectedAddonId, onAddonSelect, onViewChange, selectedView, topology }: LeftIconDockProps) {
  return <aside aria-label="Primary navigation" className={topology ? "ito-region row-start-2 flex min-h-0 flex-col items-center border-r border-border bg-card py-3 [&>.technical-label]:!left-1/2 [&>.technical-label]:!top-1/2 [&>.technical-label]:-translate-x-1/2 [&>.technical-label]:-translate-y-1/2" : "row-start-2 flex min-h-0 flex-col items-center border-r border-border bg-card py-3"} {...topology?.regionProps("07")}>
    {topology?.marker("07")}
    <div className="flex flex-col gap-2">
      {addons.map((addon, index) => <MdiTopologyRegion key={addon.id} id={`7.${index + 1}`} topology={topology}><IconDockButton active={selectedAddonId === addon.id} icon={addon.icon} label={addon.label} onClick={() => onAddonSelect(addon)} /></MdiTopologyRegion>)}
    </div>
    <div className="mt-auto flex flex-col gap-2">
      <MdiTopologyRegion id="7.4" topology={topology}><IconDockButton icon={BookOpen} label="Docs" /></MdiTopologyRegion>
      <MdiTopologyRegion id="7.5" topology={topology}><IconDockButton icon={Link} label="Link" /></MdiTopologyRegion>
      <MdiTopologyRegion id="7.6" topology={topology}><IconDockButton icon={Settings} label="Settings" /></MdiTopologyRegion>
    </div>
  </aside>;
}

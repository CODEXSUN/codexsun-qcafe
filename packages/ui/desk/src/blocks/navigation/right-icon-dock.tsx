import { Bell, History, SlidersHorizontal } from "lucide-react";
import { IconDockButton } from "./icon-dock-button.js";
import { MdiTopologyRegion, type MdiTopologyAdapter } from "../topology/mdi-topology.js";

type RightIconDockProps = {
  propertiesOpen?: boolean;
  onPropertiesClick?: () => void;
  topology?: MdiTopologyAdapter;
  version?: string;
};

export function RightIconDock({ propertiesOpen = false, onPropertiesClick, topology, version }: RightIconDockProps) {
  return <aside aria-label="Context navigation" className={topology ? "ito-region col-start-3 row-start-2 flex min-h-0 flex-col items-center gap-1 border-l border-border bg-card py-3 [&>.technical-label]:!left-1/2 [&>.technical-label]:!top-1/2 [&>.technical-label]:-translate-x-1/2 [&>.technical-label]:-translate-y-1/2" : "col-start-3 row-start-2 flex min-h-0 flex-col items-center gap-1 border-l border-border bg-card py-3"} {...topology?.regionProps("09")}>
    {topology?.marker("09")}
    <MdiTopologyRegion id="9.1" topology={topology}><IconDockButton active={propertiesOpen} icon={SlidersHorizontal} label="Properties" onClick={onPropertiesClick} /></MdiTopologyRegion>
    <MdiTopologyRegion id="9.2" topology={topology}><IconDockButton icon={History} label="Activity history" /></MdiTopologyRegion>
    <div className="mt-auto flex flex-col items-center gap-1">
      {topology && <MdiTopologyRegion className="flex items-center" id="10" topology={topology}>{topology.control}</MdiTopologyRegion>}
      <MdiTopologyRegion id="9.3" topology={topology}><IconDockButton icon={Bell} label="Notifications" /></MdiTopologyRegion>
      {version && <MdiTopologyRegion id="9.4" topology={topology}>
        <span aria-label={`CODEXSUN OS version ${version}`} className="select-none whitespace-nowrap px-0.5 text-[8px] font-medium tabular-nums text-muted-foreground" title={`CODEXSUN OS v${version}`}>v{version}</span>
      </MdiTopologyRegion>}
    </div>
  </aside>;
}

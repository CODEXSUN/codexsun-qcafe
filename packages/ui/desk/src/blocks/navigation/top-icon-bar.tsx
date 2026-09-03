import { Menu } from "lucide-react";
import { BrandIdentity } from "../brand/brand-identity.js";
import { IconDockButton } from "./icon-dock-button.js";
import { AppDeck } from "./app-deck.js";
import { GlobalSearch } from "./global-search.js";
import { NotificationDeck } from "./notification-deck.js";
import { UserDeck } from "./user-deck.js";
import { MdiTopologyRegion, type MdiTopologyAdapter } from "../topology/mdi-topology.js";

export function TopIconBar({ navigationOpen, onToggleNavigation, topology }: { navigationOpen: boolean; onToggleNavigation: () => void; topology?: MdiTopologyAdapter }) {
  return <header aria-label="Workspace commands" className={topology ? "ito-region col-span-3 flex h-14 items-center justify-between border-b border-border bg-white px-3 [&>.technical-label]:!left-1/2 [&>.technical-label]:!top-1/2 [&>.technical-label]:-translate-x-1/2 [&>.technical-label]:-translate-y-1/2 [&_button]:cursor-pointer dark:bg-card" : "col-span-3 flex h-14 items-center justify-between border-b border-border bg-white px-3 [&_button]:cursor-pointer dark:bg-card"} {...topology?.regionProps("01")}>
    {topology?.marker("01")}
    <div className="flex h-full items-center gap-1">
      <MdiTopologyRegion id="1.1" topology={topology}><IconDockButton icon={Menu} label={navigationOpen ? "Collapse side car" : "Expand side car"} onClick={onToggleNavigation} /></MdiTopologyRegion>
      <div className="h-6 w-px bg-foreground/15" />
      <MdiTopologyRegion className="flex items-center [&>.technical-label]:!left-1/2 [&>.technical-label]:!top-full [&>.technical-label]:-translate-x-1/2 [&>.technical-label]:translate-y-1" id="02" topology={topology}><BrandIdentity /></MdiTopologyRegion>
    </div>
    <div aria-label="Account and application controls" className="flex h-full items-center gap-2">
      <MdiTopologyRegion className="flex items-center [&>.technical-label]:!left-1/2 [&>.technical-label]:!top-full [&>.technical-label]:-translate-x-1/2 [&>.technical-label]:translate-y-1" id="03" topology={topology}><GlobalSearch topology={topology} /></MdiTopologyRegion>
      <MdiTopologyRegion className="flex items-center [&>.technical-label]:!left-1/2 [&>.technical-label]:!top-full [&>.technical-label]:-translate-x-1/2 [&>.technical-label]:translate-y-1" id="04" topology={topology}><NotificationDeck topology={topology} /></MdiTopologyRegion>
      <MdiTopologyRegion className="flex items-center [&>.technical-label]:!left-1/2 [&>.technical-label]:!top-full [&>.technical-label]:-translate-x-1/2 [&>.technical-label]:translate-y-1" id="05" topology={topology}><AppDeck topology={topology} /></MdiTopologyRegion>
      <MdiTopologyRegion className="flex items-center [&>.technical-label]:!left-1/2 [&>.technical-label]:!top-full [&>.technical-label]:-translate-x-1/2 [&>.technical-label]:translate-y-1" id="06" topology={topology}><UserDeck topology={topology} /></MdiTopologyRegion>
    </div>
  </header>;
}

import { MdiTopologyRegion, type MdiTopologyAdapter } from "../topology/mdi-topology.js";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Bot, Boxes, Grip, Wrench } from "lucide-react";

const applications = [
  { icon: Boxes, name: "Core" },
  { icon: Wrench, name: "DevKit" },
  { icon: Bot, name: "Agent Crew" },
] as const;

export function AppDeck({ topology }: { topology?: MdiTopologyAdapter }) {
  return <DropdownMenu.Root modal={false}>
    <DropdownMenu.Trigger asChild>
      <button aria-label="Applications" className="group grid size-11 cursor-pointer place-items-center rounded-full border border-border bg-transparent text-foreground transition-colors hover:border-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40" title="Applications" type="button"><span className="grid size-9 place-items-center rounded-full transition-colors duration-150 group-hover:bg-accent group-hover:text-accent-foreground"><Grip aria-hidden="true" className="size-5 stroke-[3]" /></span></button>
    </DropdownMenu.Trigger>
    <DropdownMenu.Portal>
      <DropdownMenu.Content onInteractOutside={(event) => { if ((event.detail.originalEvent.target as HTMLElement)?.closest?.('.technical-inspector')) event.preventDefault(); }} align="end" className="z-50 w-72 rounded-3xl border border-border bg-popover p-3 text-popover-foreground shadow-xl" sideOffset={8}>
        <DropdownMenu.Label className="px-2 pb-2 text-sm font-semibold">Applications</DropdownMenu.Label>
        <div className="grid grid-cols-3 gap-2 rounded-2xl bg-muted/70 p-2">
          {applications.map(({ icon: Icon, name }, index) => <MdiTopologyRegion key={name} id={`5.${index + 1}`} topology={topology}><DropdownMenu.Item className="flex min-h-20 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl text-xs font-medium outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground" key={name}><span className="grid size-9 place-items-center rounded-lg border border-border bg-card"><Icon className="size-4" /></span>{name}</DropdownMenu.Item></MdiTopologyRegion>)}
        </div>
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  </DropdownMenu.Root>;
}

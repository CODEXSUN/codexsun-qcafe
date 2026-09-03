import { MdiTopologyRegion, type MdiTopologyAdapter } from "../topology/mdi-topology.js";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { motion, useReducedMotion } from "framer-motion";
import { Bell, CheckCheck } from "lucide-react";

export function NotificationDeck({ topology }: { topology?: MdiTopologyAdapter }) {
  const reduceMotion = useReducedMotion();

  return <DropdownMenu.Root modal={false}>
    <DropdownMenu.Trigger asChild>
      <button aria-label="Notifications, unread activity" className="group relative grid size-11 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-[#171717] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#737373] dark:text-foreground" title="Notifications" type="button">
        <span className="grid size-9 place-items-center rounded-full transition-colors duration-150 group-hover:bg-accent group-hover:text-accent-foreground">
          <Bell aria-hidden="true" className="size-[18px] stroke-[2.25]" />
        </span>
        <span aria-hidden="true" className="absolute right-2 top-[7px] grid size-2 place-items-center">
          {!reduceMotion ? <NotificationRipples /> : null}
          <span className="relative z-10 size-1.5 rounded-full bg-[#d5102f] ring-2 ring-white dark:ring-card" />
        </span>
      </button>
    </DropdownMenu.Trigger>
    <DropdownMenu.Portal>
      <DropdownMenu.Content onInteractOutside={(event) => { if ((event.detail.originalEvent.target as HTMLElement)?.closest?.('.technical-inspector')) event.preventDefault(); }} align="end" className="z-50 w-72 rounded-2xl border border-border bg-popover p-2 text-popover-foreground shadow-lg" sideOffset={8}>
        <div className="flex items-center justify-between px-2 py-2"><span className="text-sm font-semibold">Notifications</span><CheckCheck className="size-4 text-muted-foreground" /></div>
        <MdiTopologyRegion id="4.1" topology={topology} className="rounded-xl bg-muted px-3 py-5 text-sm text-muted-foreground">No new activity in this workspace.</MdiTopologyRegion>
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  </DropdownMenu.Root>;
}

function NotificationRipples() {
  return <>
    {[0, 0.8, 1.6].map((delay) => <motion.span
      animate={{ opacity: [0, 0.82, 0.48, 0], scale: [0.55, 0.75, 1.9, 3.2] }}
      className="absolute inset-0 origin-center rounded-full border-[1.5px] border-[#b80f2c]"
      initial={{ opacity: 0, scale: 0.55 }}
      key={delay}
      transition={{ delay, duration: 2.4, ease: "easeOut", repeat: Infinity, times: [0, 0.12, 0.58, 1] }}
    />)}
  </>;
}

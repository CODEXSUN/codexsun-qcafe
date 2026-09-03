import { MdiTopologyRegion, type MdiTopologyAdapter } from "../topology/mdi-topology.js";
import * as Dialog from "@radix-ui/react-dialog";
import { Bell, Grid3X3, Home, Search, UserRound, X } from "lucide-react";
import { useEffect, useMemo, useState, type ComponentType } from "react";

type SearchCommand = {
  icon: ComponentType<{ className?: string }>;
  keywords: string;
  label: string;
  run: () => void;
};

export function GlobalSearch({ topology }: { topology?: MdiTopologyAdapter }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const commands = useSearchCommands();
  const results = commands.filter((command) => `${command.label} ${command.keywords}`.toLowerCase().includes(query.trim().toLowerCase()));

  useEffect(() => {
    const openFromKeyboard = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", openFromKeyboard);
    return () => window.removeEventListener("keydown", openFromKeyboard);
  }, []);

  const runCommand = (command: SearchCommand) => {
    setOpen(false);
    setQuery("");
    window.requestAnimationFrame(command.run);
  };

  return <Dialog.Root modal={false} onOpenChange={setOpen} open={open}>
    <Dialog.Trigger asChild>
      <button aria-label="Global search" className="group relative grid size-11 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40" type="button">
        <span className="grid size-9 place-items-center rounded-full transition-colors duration-150 group-hover:bg-accent group-hover:text-accent-foreground"><Search aria-hidden="true" className="size-[18px] stroke-[2.25]" /></span>
        <span className="pointer-events-none absolute left-1/2 top-[calc(100%+0.25rem)] z-50 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-xs font-medium text-popover-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">Search <kbd className="pl-1 font-sans text-muted-foreground">Ctrl + K</kbd></span>
      </button>
    </Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-black/25 backdrop-blur-[2px]" />
      <Dialog.Content onInteractOutside={(event) => { if ((event.detail.originalEvent.target as HTMLElement)?.closest?.('.technical-inspector')) event.preventDefault(); }} className="fixed left-1/2 top-[18vh] z-50 w-[min(36rem,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl focus:outline-none">
        <Dialog.Title className="sr-only">Global search</Dialog.Title>
        <Dialog.Description className="sr-only">Search applications and workspace commands.</Dialog.Description>
        <MdiTopologyRegion id="3.1" topology={topology} className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
          <input aria-label="Search applications and commands" autoFocus className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground" onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && results[0]) runCommand(results[0]); }} placeholder="Search applications and commands" value={query} />
          <Dialog.Close aria-label="Close global search" className="grid size-8 cursor-pointer place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"><X aria-hidden="true" className="size-4" /></Dialog.Close>
        </MdiTopologyRegion>
        <div className="max-h-80 overflow-y-auto p-2">
          {results.length ? results.map((command) => <MdiTopologyRegion key={command.label} id={`3.${commands.indexOf(command) + 2}`} topology={topology}><button className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:outline-none" key={command.label} onClick={() => runCommand(command)} type="button"><command.icon aria-hidden="true" className="size-4 text-muted-foreground" /><span>{command.label}</span></button></MdiTopologyRegion>) : <p className="px-3 py-8 text-center text-sm text-muted-foreground">No matching commands.</p>}
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}

function useSearchCommands(): SearchCommand[] {
  return useMemo(() => [
    { icon: Home, keywords: "dashboard start", label: "Go to Home", run: () => window.location.assign("/") },
    { icon: Grid3X3, keywords: "launcher apps", label: "Open Applications", run: () => clickTopBarControl("Applications") },
    { icon: Bell, keywords: "alerts inbox", label: "Open Notifications", run: () => clickTopBarControl("Notifications, unread activity") },
    { icon: UserRound, keywords: "profile account appearance", label: "Open User Menu", run: () => clickTopBarControl("User menu") },
  ], []);
}

function clickTopBarControl(label: string) {
  document.querySelector<HTMLButtonElement>(`header[aria-label="Workspace commands"] button[aria-label="${label}"]`)?.click();
}

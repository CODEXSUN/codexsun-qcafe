import { MdiTopologyRegion, type MdiTopologyAdapter } from "../topology/mdi-topology.js";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { LogOut, Moon, Sun, UserRound } from "lucide-react";
import { useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

export type MdiUserIdentity = {
  login?: string;
  workspaceLabel?: string;
  onManageProfile?: () => void;
  onSignOut?: () => void | Promise<void>;
};

export function UserDeck({ identity, topology }: { identity?: MdiUserIdentity; topology?: MdiTopologyAdapter }) {
  const [theme, setTheme] = useState<Theme>(() => readTheme());
  useEffect(() => applyTheme(theme), [theme]);
  const login = identity?.login ?? "CODEXSUN user";
  const initial = login.slice(0, 1).toUpperCase();
  const workspaceLabel = identity?.workspaceLabel ?? "Local workspace";

  return <DropdownMenu.Root modal={false}>
    <DropdownMenu.Trigger asChild>
      <button aria-label="User menu" className="group grid size-11 cursor-pointer place-items-center rounded-full border border-border bg-card p-[3px] text-sm font-medium text-foreground transition-colors hover:border-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40" title="User menu" type="button"><span className="grid size-full place-items-center rounded-full bg-muted ring-1 ring-card transition-colors duration-150 group-hover:bg-accent group-hover:text-accent-foreground">{initial}</span></button>
    </DropdownMenu.Trigger>
    <DropdownMenu.Portal>
      <DropdownMenu.Content onInteractOutside={(event) => { if ((event.detail.originalEvent.target as HTMLElement)?.closest?.('.technical-inspector')) event.preventDefault(); }} align="end" className="z-50 w-64 rounded-3xl border border-border bg-popover p-3 text-popover-foreground shadow-xl" sideOffset={8}>
        <div className="flex flex-col items-center gap-2 px-3 py-3"><span className="grid size-14 place-items-center rounded-full border border-border bg-muted text-lg font-medium">{initial}</span><span className="max-w-full truncate text-sm font-semibold">{login}</span><span className="text-xs text-muted-foreground">{workspaceLabel}</span></div>
        <DropdownMenu.Separator className="my-2 h-px bg-border" />
        <MdiTopologyRegion id="6.1" topology={topology}><DropdownMenu.Item className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50" disabled={!identity?.onManageProfile} onSelect={identity?.onManageProfile}><UserRound className="size-4" />Manage profile</DropdownMenu.Item></MdiTopologyRegion>
        <DropdownMenu.Sub>
          <MdiTopologyRegion id="6.2" topology={topology}><DropdownMenu.SubTrigger className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground">{theme === "dark" ? <Moon className="size-4" /> : <Sun className="size-4" />}Appearance</DropdownMenu.SubTrigger></MdiTopologyRegion>
          <DropdownMenu.Portal><DropdownMenu.SubContent onInteractOutside={(event) => { if ((event.detail.originalEvent.target as HTMLElement)?.closest?.('.technical-inspector')) event.preventDefault(); }} className="z-50 min-w-32 rounded-xl border border-border bg-popover p-1 shadow-lg"><ThemeOption topology={topology} id="6.2.1" active={theme === "system"} label="System" onSelect={() => setTheme("system")} /><ThemeOption topology={topology} id="6.2.2" active={theme === "light"} label="Light" onSelect={() => setTheme("light")} /><ThemeOption topology={topology} id="6.2.3" active={theme === "dark"} label="Dark" onSelect={() => setTheme("dark")} /></DropdownMenu.SubContent></DropdownMenu.Portal>
        </DropdownMenu.Sub>
        <DropdownMenu.Separator className="my-2 h-px bg-border" />
        <MdiTopologyRegion id="6.3" topology={topology}><DropdownMenu.Item className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50" disabled={!identity?.onSignOut} onSelect={identity?.onSignOut}><LogOut className="size-4" />Sign out</DropdownMenu.Item></MdiTopologyRegion>
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  </DropdownMenu.Root>;
}

function ThemeOption({ active, label, onSelect, id, topology }: { active: boolean; label: string; onSelect: () => void; id: string; topology?: MdiTopologyAdapter }) {
  return <MdiTopologyRegion id={id} topology={topology}><DropdownMenu.Item className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground" onSelect={onSelect}>{label}{active ? <span aria-hidden="true">✓</span> : null}</DropdownMenu.Item></MdiTopologyRegion>;
}

function applyTheme(theme: Theme) {
  const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.style.colorScheme = isDark ? "dark" : "light";
  window.localStorage.setItem("codexsun-theme", theme);
}

function readTheme(): Theme {
  const saved = window.localStorage.getItem("codexsun-theme");
  return saved === "light" || saved === "dark" || saved === "system" ? saved : "system";
}

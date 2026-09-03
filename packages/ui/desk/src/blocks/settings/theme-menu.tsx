import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

const options = [
  { icon: Monitor, label: "System", value: "system" },
  { icon: Sun, label: "Light", value: "light" },
  { icon: Moon, label: "Dark", value: "dark" },
] as const;

export function ThemeMenu() {
  const [theme, setTheme] = useState<Theme>(() => readTheme());

  useEffect(() => applyTheme(theme), [theme]);

  return <DropdownMenu.Root>
    <DropdownMenu.Trigger asChild>
      <button aria-label="Choose theme" className="grid size-9 cursor-pointer place-items-center rounded-md text-foreground/65 transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40" title="Theme" type="button"><Monitor className="size-4" /></button>
    </DropdownMenu.Trigger>
    <DropdownMenu.Portal>
      <DropdownMenu.Content align="end" className="z-50 min-w-32 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md" sideOffset={8}>
        <DropdownMenu.RadioGroup onValueChange={(value) => setTheme(value as Theme)} value={theme}>
          {options.map(({ icon: Icon, label, value }) => <DropdownMenu.RadioItem className="relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground" key={value} value={value}><Icon className="size-4" /><span>{label}</span><DropdownMenu.ItemIndicator className="ml-auto"><Check className="size-4" /></DropdownMenu.ItemIndicator></DropdownMenu.RadioItem>)}
        </DropdownMenu.RadioGroup>
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  </DropdownMenu.Root>;
}

function applyTheme(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
  window.localStorage.setItem("codexsun-theme", theme);
}

function readTheme(): Theme {
  const saved = window.localStorage.getItem("codexsun-theme");
  return saved === "light" || saved === "dark" || saved === "system" ? saved : "system";
}

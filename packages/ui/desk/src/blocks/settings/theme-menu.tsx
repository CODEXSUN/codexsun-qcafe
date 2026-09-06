import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useThemeMode, type ThemeMode } from "@codexsun/ui/design-system";

const options = [
  { icon: Monitor, label: "System theme", value: "system" as ThemeMode },
  { icon: Sun, label: "White theme", value: "light" as ThemeMode },
  { icon: Moon, label: "Dark theme", value: "dark" as ThemeMode },
] as const;

export function ThemeMenu() {
  const { mode, resolvedTheme, setMode } = useThemeMode();

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          aria-label="Choose theme"
          className="grid size-9 cursor-pointer place-items-center rounded-md text-foreground/65 transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40"
          title={`Theme: ${mode} (${resolvedTheme})`}
          type="button"
        >
          {resolvedTheme === "dark" ? <Moon className="size-4" /> : <Sun className="size-4" />}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          className="z-50 min-w-36 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
          sideOffset={8}
        >
          <DropdownMenu.RadioGroup
            onValueChange={(value) => setMode(value as ThemeMode)}
            value={mode}
          >
            {options.map(({ icon: Icon, label, value }) => (
              <DropdownMenu.RadioItem
                className="relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
                key={value}
                value={value}
              >
                <Icon className="size-4" />
                <span>{label}</span>
                <DropdownMenu.ItemIndicator className="ml-auto">
                  <Check className="size-4 text-primary" />
                </DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

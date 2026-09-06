import { useState, useEffect } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, Laptop, Moon, Palette, Sun } from "lucide-react";
import {
  designSystemVariants,
  getCurrentDesignSystemVariantId,
  setDesignSystemVariantId,
  useThemeMode,
  type DesignSystemVariantId,
  type ThemeMode
} from "@codexsun/ui/design-system";
import { MdiTopologyRegion, type MdiTopologyAdapter } from "../topology/mdi-topology.js";

export function ThemeDeck({ topology }: { topology?: MdiTopologyAdapter }) {
  const [activeVariantId, setActiveVariantId] = useState<DesignSystemVariantId>(() =>
    getCurrentDesignSystemVariantId()
  );
  const { mode, setMode } = useThemeMode();

  useEffect(() => {
    setActiveVariantId(getCurrentDesignSystemVariantId());
  }, []);

  function selectVariant(id: DesignSystemVariantId) {
    setActiveVariantId(id);
    setDesignSystemVariantId(id);
  }

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <button
          aria-label="Design theme and palette selection"
          className="group relative grid size-11 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-[#171717] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#737373] dark:text-foreground"
          title="Design theme"
          type="button"
        >
          <span className="grid size-9 place-items-center rounded-full transition-colors duration-150 group-hover:bg-accent group-hover:text-accent-foreground">
            <Palette aria-hidden="true" className="size-[18px] stroke-[2.25]" />
          </span>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          onInteractOutside={(event) => {
            if ((event.detail.originalEvent.target as HTMLElement)?.closest?.(".technical-inspector")) {
              event.preventDefault();
            }
          }}
          align="end"
          className="z-50 w-72 rounded-2xl border border-border bg-popover p-2 text-popover-foreground shadow-lg"
          sideOffset={8}
        >
          {/* Quick Theme Mode Selector */}
          <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
            THEME MODE
          </div>
          <div className="grid grid-cols-3 gap-1 px-1 pb-1">
            {[
              { id: "light" as ThemeMode, label: "White", icon: Sun, topologyId: "6.2.2" },
              { id: "dark" as ThemeMode, label: "Dark", icon: Moon, topologyId: "6.2.3" },
              { id: "system" as ThemeMode, label: "System", icon: Laptop, topologyId: "6.2.1" }
            ].map((item) => {
              const active = mode === item.id;
              const Icon = item.icon;
              return (
                <MdiTopologyRegion id={item.topologyId} key={item.id} topology={topology}>
                  <button
                    type="button"
                    onClick={() => setMode(item.id)}
                    className={`flex w-full cursor-pointer flex-col items-center gap-1 rounded-xl p-2 text-xs transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    <Icon className="size-4" />
                    <span>{item.label}</span>
                  </button>
                </MdiTopologyRegion>
              );
            })}
          </div>

          <div className="my-1.5 h-px bg-border" />

          {/* Design System Variant */}
          <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
            DESIGN SYSTEM THEME
          </div>
          <div className="space-y-1">
            {designSystemVariants.map((variant) => {
              const active = variant.id === activeVariantId;
              return (
                <DropdownMenu.Item
                  key={variant.id}
                  className="flex cursor-pointer items-center gap-3 rounded-xl p-2 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                  onSelect={() => selectVariant(variant.id)}
                >
                  <div className="flex -space-x-1">
                    {variant.palette.slice(0, 4).map((color, index) => (
                      <span
                        key={index}
                        className="size-4 rounded-full border border-background shadow-sm"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{variant.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{variant.density}</div>
                  </div>
                  {active ? <Check className="size-4 text-primary" /> : null}
                </DropdownMenu.Item>
              );
            })}
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

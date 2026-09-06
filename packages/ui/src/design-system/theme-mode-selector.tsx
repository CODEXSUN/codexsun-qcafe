import { useState, useEffect } from "react";
import { Copy, Download, Moon, Sun, Laptop, Check } from "lucide-react";
import { useThemeMode, type ThemeMode } from "./theme-mode";

export interface ThemeModeSelectorProps {
  className?: string;
  showAdvanced?: boolean;
  onSelect?: (mode: ThemeMode) => void;
}

export const THEME_ACCENT_KEY = "codexsun.theme-accent";
export const THEME_CONTRAST_KEY = "codexsun.theme-contrast";
export const THEME_TRANSLUCENT_SIDEBAR_KEY = "codexsun.theme-translucent-sidebar";

export function ThemeModeSelector({
  className,
  showAdvanced = true,
  onSelect
}: ThemeModeSelectorProps) {
  const { mode, resolvedTheme, setMode } = useThemeMode();

  const [accent, setAccent] = useState(() => {
    if (typeof window === "undefined") return "White";
    return window.localStorage.getItem(THEME_ACCENT_KEY) ?? "White";
  });

  const [contrast, setContrast] = useState(() => {
    if (typeof window === "undefined") return 60;
    const val = Number(window.localStorage.getItem(THEME_CONTRAST_KEY));
    return Number.isFinite(val) && val > 0 ? val : 60;
  });

  const [translucentSidebar, setTranslucentSidebar] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = window.localStorage.getItem(THEME_TRANSLUCENT_SIDEBAR_KEY);
    return stored === null ? true : stored === "true";
  });

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    window.localStorage.setItem(THEME_ACCENT_KEY, accent);
    window.localStorage.setItem(THEME_CONTRAST_KEY, String(contrast));
    window.localStorage.setItem(THEME_TRANSLUCENT_SIDEBAR_KEY, String(translucentSidebar));
  }, [accent, contrast, translucentSidebar]);

  const handleSelectMode = (nextMode: ThemeMode) => {
    setMode(nextMode);
    onSelect?.(nextMode);
  };

  const handleCopyTheme = () => {
    const config = {
      theme: mode,
      resolved: resolvedTheme,
      background: "#181818",
      foreground: "oklch(0.90 0 0)", // 90% white to prevent eye irritation
      accent,
      contrast,
      translucentSidebar
    };
    navigator.clipboard?.writeText(JSON.stringify(config, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex flex-col gap-6 ${className ?? ""}`}>
      {/* 1. Top Section: 3 Preview Cards (System, Light, Dark) matching screenshot */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* System Card */}
        <div className="flex flex-col items-center gap-2.5">
          <button
            type="button"
            onClick={() => handleSelectMode("system")}
            aria-pressed={mode === "system"}
            data-topology-id="6.2.1"
            className={`group relative flex h-48 w-full cursor-pointer overflow-hidden rounded-2xl border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              mode === "system"
                ? "border-foreground/80 ring-2 ring-foreground/90 shadow-md"
                : "border-border/60 hover:border-border hover:shadow-xs"
            }`}
          >
            <div className="grid size-full grid-cols-2">
              {/* Left: Medium-light gray background */}
              <div className="flex items-center justify-end bg-[#8b8b93] pr-0 pb-0">
                {/* Elevated Half-Sheet (Light side) */}
                <div className="flex h-36 w-28 flex-col justify-start rounded-l-xl bg-white p-2.5 shadow-lg">
                  {/* Top Bar */}
                  <div className="mb-2 h-2.5 w-14 rounded-sm bg-neutral-300" />
                  {/* Content lines */}
                  <div className="space-y-1.5 pt-1">
                    <div className="h-1.5 w-20 rounded-xs bg-neutral-200" />
                    <div className="h-1.5 w-16 rounded-xs bg-neutral-200" />
                    <div className="mt-3 h-1.5 w-12 rounded-xs bg-neutral-200" />
                    <div className="h-1.5 w-18 rounded-xs bg-neutral-200" />
                  </div>
                </div>
              </div>

              {/* Right: Dark charcoal background */}
              <div className="flex items-center justify-start bg-[#27272a] pl-0 pb-0">
                {/* Elevated Half-Sheet (Dark side) */}
                <div className="flex h-36 w-28 flex-col justify-start rounded-r-xl border-y border-r border-[#38383e] bg-[#181818] p-2.5 shadow-lg">
                  {/* Top Bar */}
                  <div className="mb-2 h-2.5 w-14 rounded-sm bg-[#52525b]" />
                  {/* Content lines */}
                  <div className="space-y-1.5 pt-1">
                    <div className="h-1.5 w-20 rounded-xs bg-[#3f3f46]" />
                    <div className="h-1.5 w-16 rounded-xs bg-[#3f3f46]" />
                    <div className="mt-3 h-1.5 w-12 rounded-xs bg-[#3f3f46]" />
                    <div className="h-1.5 w-18 rounded-xs bg-[#3f3f46]" />
                  </div>
                </div>
              </div>
            </div>
          </button>
          <span
            className={`text-sm font-medium transition-colors ${
              mode === "system" ? "font-semibold text-foreground" : "text-muted-foreground"
            }`}
          >
            System
          </span>
        </div>

        {/* Light Card */}
        <div className="flex flex-col items-center gap-2.5">
          <button
            type="button"
            onClick={() => handleSelectMode("light")}
            aria-pressed={mode === "light"}
            data-topology-id="6.2.2"
            className={`group relative flex h-48 w-full cursor-pointer items-center justify-center overflow-hidden rounded-2xl border bg-[#e4e4e7] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              mode === "light"
                ? "border-foreground/80 ring-2 ring-foreground/90 shadow-md"
                : "border-border/60 hover:border-border hover:shadow-xs"
            }`}
          >
            {/* Elevated Light Sheet */}
            <div className="flex h-36 w-44 flex-col justify-start rounded-xl bg-white p-3 shadow-lg transition-transform group-hover:scale-[1.02]">
              {/* Header bar */}
              <div className="mb-3 flex items-center justify-between border-b border-neutral-100 pb-2">
                <div className="h-2.5 w-16 rounded-sm bg-neutral-300" />
                <div className="flex gap-1">
                  <span className="size-1.5 rounded-full bg-neutral-300" />
                  <span className="size-1.5 rounded-full bg-neutral-300" />
                </div>
              </div>
              {/* Content lines */}
              <div className="space-y-2">
                <div className="h-2 w-32 rounded-xs bg-neutral-200" />
                <div className="h-2 w-24 rounded-xs bg-neutral-200" />
                <div className="h-2 w-36 rounded-xs bg-neutral-100" />
                <div className="h-2 w-20 rounded-xs bg-neutral-100" />
              </div>
            </div>
          </button>
          <span
            className={`text-sm font-medium transition-colors ${
              mode === "light" ? "font-semibold text-foreground" : "text-muted-foreground"
            }`}
          >
            Light
          </span>
        </div>

        {/* Dark Card */}
        <div className="flex flex-col items-center gap-2.5">
          <button
            type="button"
            onClick={() => handleSelectMode("dark")}
            aria-pressed={mode === "dark"}
            data-topology-id="6.2.3"
            className={`group relative flex h-48 w-full cursor-pointer items-center justify-center overflow-hidden rounded-2xl border bg-[#3f3f46] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              mode === "dark"
                ? "border-white ring-2 ring-white/90 shadow-md"
                : "border-border/60 hover:border-border hover:shadow-xs"
            }`}
          >
            {/* Elevated Dark Sheet */}
            <div className="flex h-36 w-44 flex-col justify-start rounded-xl border border-[#2e2e34] bg-[#181818] p-3 shadow-xl transition-transform group-hover:scale-[1.02]">
              {/* Header bar */}
              <div className="mb-3 flex items-center justify-between border-b border-[#2e2e34] pb-2">
                <div className="h-2.5 w-16 rounded-sm bg-[#71717a]" />
                <div className="flex gap-1">
                  <span className="size-1.5 rounded-full bg-[#71717a]" />
                  <span className="size-1.5 rounded-full bg-[#71717a]" />
                </div>
              </div>
              {/* Content lines in soft 90% eye-friendly white */}
              <div className="space-y-2">
                <div className="h-2 w-32 rounded-xs bg-[#e4e4e7]/70" />
                <div className="h-2 w-24 rounded-xs bg-[#e4e4e7]/70" />
                <div className="h-2 w-36 rounded-xs bg-[#71717a]/50" />
                <div className="h-2 w-20 rounded-xs bg-[#71717a]/50" />
              </div>
            </div>
          </button>
          <span
            className={`text-sm font-medium transition-colors ${
              mode === "dark" ? "font-semibold text-foreground" : "text-muted-foreground"
            }`}
          >
            Dark
          </span>
        </div>
      </div>

      {showAdvanced && (
        <>
          {/* 2. Middle Section: Diff Code Preview matching screenshot */}
          <div className="overflow-hidden rounded-xl border border-[#27272a] bg-[#141416] font-mono text-xs shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#27272a]">
              {/* Left Diff Snippet */}
              <div className="p-3 text-[12px] leading-relaxed">
                <div className="flex items-center gap-3 text-muted-foreground/60">
                  <span className="w-4 select-none text-right">1</span>
                  <span>
                    <span className="text-[#a78bfa]">const</span>{" "}
                    <span className="text-[#f59e0b]">themePreview</span>:{" "}
                    <span className="text-[#60a5fa]">ThemeConfig</span> = {"{"}
                  </span>
                </div>
                <div className="flex items-center gap-3 bg-red-950/30 -mx-3 px-3 border-l-2 border-red-500/80 text-red-200">
                  <span className="w-4 select-none text-right text-red-400">2</span>
                  <span>
                    &nbsp;&nbsp;surface: <span className="text-[#f87171]">&quot;sidebar&quot;</span>,
                  </span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground/80">
                  <span className="w-4 select-none text-right">3</span>
                  <span>
                    &nbsp;&nbsp;accent: <span className="text-[#38bdf8]">&quot;#2563eb&quot;</span>,
                  </span>
                </div>
                <div className="flex items-center gap-3 bg-red-950/20 -mx-3 px-3 text-red-300">
                  <span className="w-4 select-none text-right text-red-400">4</span>
                  <span>
                    &nbsp;&nbsp;contrast: <span className="text-[#fbbf24]">42</span>,
                  </span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground/60">
                  <span className="w-4 select-none text-right">5</span>
                  <span>{"};"}</span>
                </div>
              </div>

              {/* Right Diff Snippet */}
              <div className="p-3 text-[12px] leading-relaxed">
                <div className="flex items-center gap-3 text-muted-foreground/60">
                  <span className="w-4 select-none text-right">1</span>
                  <span>
                    <span className="text-[#a78bfa]">const</span>{" "}
                    <span className="text-[#f59e0b]">themePreview</span>:{" "}
                    <span className="text-[#60a5fa]">ThemeConfig</span> = {"{"}
                  </span>
                </div>
                <div className="flex items-center gap-3 bg-emerald-950/35 -mx-3 px-3 border-l-2 border-emerald-500/80 text-emerald-200">
                  <span className="w-4 select-none text-right text-emerald-400">2</span>
                  <span>
                    &nbsp;&nbsp;surface:{" "}
                    <span className="text-[#34d399]">&quot;sidebar-elevated&quot;</span>,
                  </span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground/80">
                  <span className="w-4 select-none text-right">3</span>
                  <span>
                    &nbsp;&nbsp;accent: <span className="text-[#38bdf8]">&quot;#0ea5e9&quot;</span>,
                  </span>
                </div>
                <div className="flex items-center gap-3 bg-emerald-950/25 -mx-3 px-3 text-emerald-300">
                  <span className="w-4 select-none text-right text-emerald-400">4</span>
                  <span>
                    &nbsp;&nbsp;contrast: <span className="text-[#fbbf24]">{contrast}</span>,
                  </span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground/60">
                  <span className="w-4 select-none text-right">5</span>
                  <span>{"};"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Bottom Section: Dark Theme Configuration matching screenshot */}
          <div className="rounded-2xl border border-[#27272a] bg-[#181818] p-5 shadow-sm text-foreground">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#27272a] pb-4">
              <h3 className="text-base font-semibold text-[#e4e4e7]">Dark theme</h3>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={handleCopyTheme}
                  className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-[#a1a1aa] hover:bg-[#27272a] hover:text-[#e4e4e7] transition-colors"
                >
                  {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                  <span>{copied ? "Copied" : "Copy theme"}</span>
                </button>
                <div className="flex items-center gap-1 rounded-lg border border-[#2e2e34] bg-[#222226] px-2 py-1 text-[11px] font-semibold text-[#a1a1aa]">
                  <span className="text-[#60a5fa]">Aa</span>
                  <span className="text-[#e4e4e7]">Codex</span>
                </div>
              </div>
            </div>

            {/* Config rows */}
            <div className="divide-y divide-[#27272a]/70">
              {/* Accent Row */}
              <div className="flex items-center justify-between py-3.5 text-sm">
                <span className="text-sm font-medium text-[#a1a1aa]">Accent</span>
                <select
                  value={accent}
                  onChange={(e) => setAccent(e.target.value)}
                  className="h-8 cursor-pointer rounded-lg border border-[#2e2e34] bg-[#222226] px-3 text-xs text-[#e4e4e7] outline-none focus-visible:ring-1 focus-visible:ring-[#71717a]"
                >
                  <option value="White">White</option>
                  <option value="Cyan">Cyan</option>
                  <option value="Blue">Blue</option>
                  <option value="Emerald">Emerald</option>
                  <option value="Amber">Amber</option>
                  <option value="Violet">Violet</option>
                </select>
              </div>

              {/* Background Row */}
              <div className="flex items-center justify-between py-3.5 text-sm">
                <span className="text-sm font-medium text-[#a1a1aa]">Background</span>
                <div className="flex items-center gap-2 rounded-lg border border-[#2e2e34] bg-[#222226] px-2.5 py-1 text-xs">
                  <span className="size-3 rounded-full border border-white/20 bg-[#181818]" />
                  <span className="font-mono text-[11px] text-[#e4e4e7]">#181818</span>
                </div>
              </div>

              {/* Foreground Row with 90% soft white */}
              <div className="flex flex-col gap-1 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[#a1a1aa]">Foreground</span>
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                      90% Eye-friendly
                    </span>
                  </div>
                  <p className="text-[11px] text-[#71717a]">
                    Non-glare soft white (oklch 90%) designed to eliminate eye fatigue.
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-[#2e2e34] bg-[#222226] px-2.5 py-1 text-xs">
                  <span className="size-3 rounded-full border border-black/30 bg-[#e4e4e7]" />
                  <span className="font-mono text-[11px] text-[#e4e4e7]">#E4E4E7 (90%)</span>
                </div>
              </div>

              {/* UI font */}
              <div className="flex items-center justify-between py-3.5 text-sm">
                <span className="text-sm font-medium text-[#a1a1aa]">UI font</span>
                <div className="flex items-center gap-2">
                  <span className="rounded-md border border-[#2e2e34] bg-[#222226] px-2.5 py-1 text-xs text-[#e4e4e7]">
                    System default
                  </span>
                  <span className="text-xs text-[#71717a]">Regular</span>
                </div>
              </div>

              {/* Content font */}
              <div className="flex items-center justify-between py-3.5 text-sm">
                <span className="text-sm font-medium text-[#a1a1aa]">Content font</span>
                <div className="flex items-center gap-2">
                  <span className="rounded-md border border-[#2e2e34] bg-[#222226] px-2.5 py-1 text-xs text-[#e4e4e7]">
                    Same as UI font
                  </span>
                  <span className="text-xs text-[#71717a]">Regular</span>
                </div>
              </div>

              {/* Code font */}
              <div className="flex items-center justify-between py-3.5 text-sm">
                <span className="text-sm font-medium text-[#a1a1aa]">Code font</span>
                <div className="flex items-center gap-2">
                  <span className="rounded-md border border-[#2e2e34] bg-[#222226] px-2.5 py-1 text-xs text-[#e4e4e7]">
                    System default
                  </span>
                  <span className="text-xs text-[#71717a]">Regular</span>
                </div>
              </div>

              {/* Translucent sidebar */}
              <div className="flex items-center justify-between py-3.5 text-sm">
                <span className="text-sm font-medium text-[#a1a1aa]">Translucent sidebar</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={translucentSidebar}
                  onClick={() => setTranslucentSidebar((prev) => !prev)}
                  className={`relative inline-flex h-5 w-9 cursor-pointer shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    translucentSidebar ? "bg-[#3b82f6]" : "bg-[#3f3f46]"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      translucentSidebar ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Contrast */}
              <div className="flex items-center justify-between py-3.5 text-sm">
                <span className="text-sm font-medium text-[#a1a1aa]">Contrast</span>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="30"
                    max="100"
                    value={contrast}
                    onChange={(e) => setContrast(Number(e.target.value))}
                    className="h-1.5 w-32 cursor-pointer accent-[#3b82f6]"
                  />
                  <span className="w-6 text-right font-mono text-xs text-[#e4e4e7]">
                    {contrast}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

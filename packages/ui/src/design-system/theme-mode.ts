import { useEffect, useState } from "react";

export type ThemeMode = "system" | "light" | "dark";

export const THEME_MODE_STORAGE_KEY = "codexsun.theme-mode";
export const THEME_MODE_CHANGE_EVENT = "codexsun:theme-mode-change";

let mediaQueryListener: ((event: MediaQueryListEvent) => void) | null = null;
let mediaQueryList: MediaQueryList | null = null;

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === "system" || value === "light" || value === "dark";
}

export function getThemeModePreference(): ThemeMode {
  if (typeof window === "undefined") return "system";
  const stored = window.localStorage.getItem(THEME_MODE_STORAGE_KEY);
  return isThemeMode(stored) ? stored : "system";
}

export function getResolvedThemeMode(mode: ThemeMode = getThemeModePreference()): "light" | "dark" {
  if (mode === "dark") return "dark";
  if (mode === "light") return "light";
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return "light";
}

export function applyThemeModePreference(mode: ThemeMode = getThemeModePreference()): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const resolved = getResolvedThemeMode(mode);
  const root = document.documentElement;

  if (resolved === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }

  root.style.colorScheme = resolved;
  root.setAttribute("data-theme-mode", mode);

  // Manage system media query listener
  if (window.matchMedia) {
    if (mediaQueryList && mediaQueryListener) {
      mediaQueryList.removeEventListener("change", mediaQueryListener);
      mediaQueryListener = null;
    }

    if (mode === "system") {
      mediaQueryList = window.matchMedia("(prefers-color-scheme: dark)");
      mediaQueryListener = (event: MediaQueryListEvent) => {
        const nextResolved = event.matches ? "dark" : "light";
        if (nextResolved === "dark") {
          root.classList.add("dark");
        } else {
          root.classList.remove("dark");
        }
        root.style.colorScheme = nextResolved;
        window.dispatchEvent(new CustomEvent(THEME_MODE_CHANGE_EVENT, { detail: "system" }));
      };
      mediaQueryList.addEventListener("change", mediaQueryListener);
    }
  }
}

export function setThemeModePreference(mode: ThemeMode): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(THEME_MODE_STORAGE_KEY, mode);
  applyThemeModePreference(mode);
  window.dispatchEvent(new CustomEvent(THEME_MODE_CHANGE_EVENT, { detail: mode }));
}

export function useThemeMode(): {
  mode: ThemeMode;
  resolvedTheme: "light" | "dark";
  setMode: (mode: ThemeMode) => void;
} {
  const [mode, setModeState] = useState<ThemeMode>(() => getThemeModePreference());
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(() =>
    getResolvedThemeMode(getThemeModePreference())
  );

  useEffect(() => {
    function handleUpdate() {
      const current = getThemeModePreference();
      setModeState(current);
      setResolvedTheme(getResolvedThemeMode(current));
    }

    window.addEventListener(THEME_MODE_CHANGE_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener(THEME_MODE_CHANGE_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const setMode = (nextMode: ThemeMode) => {
    setThemeModePreference(nextMode);
    setModeState(nextMode);
    setResolvedTheme(getResolvedThemeMode(nextMode));
  };

  return { mode, resolvedTheme, setMode };
}

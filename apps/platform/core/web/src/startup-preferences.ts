import { useState } from "react";

// Composition metadata uses application entry points, never application internals.
export const startupFeatures = [
  { id: "navigation", name: "Workspace drawer", detail: "Open repository navigation when CODEXSUN OS starts." },
  { id: "menu", name: "Main menu", detail: "Expand the application menu at startup." },
  { id: "properties", name: "Properties drawer", detail: "Open run activity and properties at startup." },
  { id: "suggestions", name: "Suggested prompts", detail: "Show starter prompts in new conversations." },
] as const;

export type StartupPreferences = {
  applications: Record<string, boolean>;
  features: Record<typeof startupFeatures[number]["id"], boolean>;
  iotEnabled: boolean;
  tags: Record<string, string[]>;
};

const storageKey = "codexsun.workspace.startup.v1";

export function readStartupPreferences(storage: Pick<Storage, "getItem">): StartupPreferences {
  const defaults: StartupPreferences = { applications: {}, features: { navigation: true, menu: true, properties: true, suggestions: true }, iotEnabled: false, tags: {} };
  try {
    const saved = JSON.parse(storage.getItem(storageKey) ?? "null");
    if (!saved || typeof saved !== "object") return defaults;
    for (const feature of startupFeatures) {
      if (typeof saved.features?.[feature.id] === "boolean") defaults.features[feature.id] = saved.features[feature.id];
    }
    for (const [id, enabled] of Object.entries(saved.applications ?? {})) defaults.applications[id] = enabled === true;
    for (const [id, tags] of Object.entries(saved.tags ?? {})) {
      if (Array.isArray(tags)) defaults.tags[id] = normalizeTags(tags.filter((tag: unknown) => typeof tag === "string").join(","));
    }
    defaults.iotEnabled = saved.iotEnabled === true;
  } catch { /* Invalid or unavailable browser storage must not prevent startup. */ }
  return defaults;
}

export function normalizeTags(value: string): string[] {
  return [...new Set(value.split(",").map((tag) => tag.trim().toLowerCase()).filter(Boolean))].slice(0, 12).map((tag) => tag.slice(0, 40));
}

export function useStartupPreferences() {
  const [preferences, setPreferences] = useState(() => {
    try { return readStartupPreferences(window.localStorage); }
    catch { return readStartupPreferences({ getItem: () => null }); }
  });
  const [error, setError] = useState("");
  function update(next: StartupPreferences) {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      setPreferences(next);
      setError("");
    } catch { setError("Preferences could not be saved. Allow browser storage and try again."); }
  }
  return { preferences, update, error };
}

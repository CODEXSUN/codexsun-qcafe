import type { ModuleManifest } from "@codexsun/contracts";

export function installedApplications(): ModuleManifest[] {
  if (process.env.OS_APPLICATIONS_ENABLED === "false") return [];
  return [
    { id: "app.devkit", name: "DevKit", description: "Developer tools and workspace.", kind: "application", runtime: "static", version: "0.1.1", dependencies: [], capabilities: [], webUrl: process.env.DEVKIT_WEB_URL ?? "http://127.0.0.1:5174" },
    { id: "app.zetro", name: "Zetro", description: "Chat with isolated specialist agents.", kind: "application", runtime: "static", version: "0.1.1", dependencies: [], capabilities: ["agent-dispatch", "conversations"], webUrl: process.env.ZETRO_WEB_URL ?? "http://127.0.0.1:5175" },
  ];
}

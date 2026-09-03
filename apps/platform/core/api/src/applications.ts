import type { ModuleManifest } from "@codexsun/contracts";

export function installedApplications(): ModuleManifest[] {
  if (process.env.OS_APPLICATIONS_ENABLED === "false") return [
    { id: "app.q-cafe", name: "Q Cafe", description: "Restaurant POS, kitchen, inventory and bookings.", kind: "application", runtime: "static", version: "0.1.2", dependencies: [], capabilities: [], webUrl: process.env.QCAFE_WEB_URL ?? "http://127.0.0.1:5180" },];
  return [
    { id: "app.q-cafe", name: "Q Cafe", description: "Restaurant POS, kitchen, inventory and bookings.", kind: "application", runtime: "static", version: "0.1.2", dependencies: [], capabilities: [], webUrl: process.env.QCAFE_WEB_URL ?? "http://127.0.0.1:5180" },
    { id: "app.devkit", name: "DevKit", description: "Developer tools and workspace.", kind: "application", runtime: "static", version: "0.1.1", dependencies: [], capabilities: [], webUrl: process.env.DEVKIT_WEB_URL ?? "http://127.0.0.1:5174" },
    { id: "app.zetro", name: "Zetro", description: "Chat with isolated specialist agents.", kind: "application", runtime: "static", version: "0.1.1", dependencies: [], capabilities: ["agent-dispatch", "conversations"], webUrl: process.env.ZETRO_WEB_URL ?? "http://127.0.0.1:5175" },
  ];
}

import type { ModuleManifest } from "@codexsun/contracts";

export function installedApplications(): ModuleManifest[] {
  if (process.env.OS_PUBLIC_BASE_URL) {
    const base = new URL(process.env.OS_PUBLIC_BASE_URL).origin;
    return [
      { id: "app.zetro", name: "Zetro", description: "Agent workspace.", kind: "application", runtime: "static", version: "0.1.13", dependencies: [], capabilities: ["agent-dispatch", "conversations"], webUrl: `${base}/?app=zetro&addon=zetro&page=agent` },
      { id: "app.chat", name: "Chat", description: "Connected conversations.", kind: "application", runtime: "static", version: "0.1.13", dependencies: [], capabilities: ["chat"], webUrl: `${base}/?app=chat&addon=chat` },
      { id: "app.ai-task-system", name: "Tasks", description: "Task planning and reviewed execution.", kind: "application", runtime: "static", version: "0.1.13", dependencies: [], capabilities: ["tasks"], webUrl: `${base}/?app=ai-tasks&addon=ai-tasks` },
      { id: "app.orship", name: "Orship", description: "Reviewed release operations and cloud handoff.", kind: "application", runtime: "static", version: "0.1.24", dependencies: [], capabilities: ["releases", "deployment-state"], webUrl: `${base}/?app=orship&addon=orship&page=operations` },
      { id: "app.device-chat", name: "Device Chat", description: "Trusted device communication through DCS.", kind: "application", runtime: "static", version: "0.1.14", dependencies: [], capabilities: ["device-events", "device-messages"], webUrl: `${base}/?app=device-chat&addon=device-chat&page=messages` },
      { id: "app.docs", name: "Docs", description: "Architecture and operating documentation.", kind: "application", runtime: "static", version: "0.1.14", dependencies: [], capabilities: ["documentation"], webUrl: `${base}/?app=docs&addon=docs&page=architecture` },
    ];
  }
  if (process.env.OS_APPLICATIONS_ENABLED === "false") return [
    { id: "app.q-cafe", name: "Q Cafe", description: "Restaurant POS, kitchen, inventory and bookings.", kind: "application", runtime: "static", version: "0.1.2", dependencies: [], capabilities: [], webUrl: process.env.QCAFE_WEB_URL ?? "http://127.0.0.1:5180" },];
  return [
    { id: "app.q-cafe", name: "Q Cafe", description: "Restaurant POS, kitchen, inventory and bookings.", kind: "application", runtime: "static", version: "0.1.2", dependencies: [], capabilities: [], webUrl: process.env.QCAFE_WEB_URL ?? "http://127.0.0.1:5180" },
    { id: "app.devkit", name: "DevKit", description: "Developer tools and workspace.", kind: "application", runtime: "static", version: "0.1.1", dependencies: [], capabilities: [], webUrl: process.env.DEVKIT_WEB_URL ?? "http://127.0.0.1:5174" },
    { id: "app.zetro", name: "Zetro", description: "Chat with isolated specialist agents.", kind: "application", runtime: "static", version: "0.1.1", dependencies: [], capabilities: ["agent-dispatch", "conversations"], webUrl: process.env.ZETRO_WEB_URL ?? "http://127.0.0.1:5175" },
    { id: "app.orship", name: "Orship", description: "Reviewed release operations and cloud handoff.", kind: "application", runtime: "static", version: "0.1.24", dependencies: [], capabilities: ["releases", "deployment-state"], webUrl: process.env.PLATFORM_WEB_URL ?? "http://127.0.0.1:5173/?app=orship&addon=orship&page=operations" },
    { id: "app.device-chat", name: "Device Chat", description: "Trusted device communication through DCS.", kind: "application", runtime: "static", version: "0.1.14", dependencies: [], capabilities: ["device-events", "device-messages"], webUrl: process.env.PLATFORM_WEB_URL ?? "http://127.0.0.1:5173" },
    { id: "app.docs", name: "Docs", description: "Architecture and operating documentation.", kind: "application", runtime: "static", version: "0.1.14", dependencies: [], capabilities: ["documentation"], webUrl: process.env.DOCS_WEB_URL ?? "http://127.0.0.1:5185" },
  ];
}

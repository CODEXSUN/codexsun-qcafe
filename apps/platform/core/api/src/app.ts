import cors from "@fastify/cors";
import Fastify from "fastify";
import { PlatformCore } from "@codexsun/runtime";
import { platformManifests } from "./manifests.js";
import { installedApplications } from "./applications.js";
import { registerPlatformOwnership, validatePlatformManifestOwnership } from "./ownership.js";

export function buildApp(options: { applications?: ReturnType<typeof installedApplications> } = {}) {
  const app = Fastify({ logger: true });
  const core = new PlatformCore();
  const applications = options.applications ?? installedApplications();
  registerPlatformOwnership(core);
  validatePlatformManifestOwnership(core, platformManifests);
  for (const manifest of [...platformManifests, ...applications]) core.registry.register(manifest);
  core.registry.validateDependencies();
  app.addHook("onReady", async () => core.framework.start());
  app.addHook("onClose", async () => core.framework.stop());
  void app.register(cors, { origin: ["http://127.0.0.1:5173", "http://127.0.0.1:5174", "http://127.0.0.1:5175"] });
  app.get("/health", async () => ({ status: "ok" }));
  app.get("/api/v1/core", async () => core.snapshot());
  return app;
}

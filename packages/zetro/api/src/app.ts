import cors from "@fastify/cors";
import Fastify from "fastify";
import { resolve } from "node:path";
import { AgentRegistry } from "./registry.js";
import { ZetroDispatcher } from "./dispatcher.js";
import { registerZetro } from "./index.js";
import { RunEngine } from "./runs.js";
import { registerRunRoutes } from "./run-routes.js";

export function buildZetroApp(options: { dispatcher?: ZetroDispatcher } = {}) {
  const app = Fastify({ logger: true, bodyLimit: 3_000_000 });
  const registryFile = resolve(import.meta.dirname, "../../../../apps/agent-crew/docker/zetro-agents.example.json");
  const dispatcher = options.dispatcher ?? new ZetroDispatcher(AgentRegistry.fromEnvironment(registryFile));
  void app.register(cors, { origin: ["http://127.0.0.1:5173", "http://127.0.0.1:5175"] });
  app.get("/health", async () => ({ status: "ok", service: "zetro" }));
  registerZetro(app, dispatcher);
  if (!options.dispatcher) registerRunRoutes(app, new RunEngine(dispatcher, process.env.ZETRO_DATABASE_FILE ?? resolve(import.meta.dirname, "../state/zetro.db")));
  return app;
}

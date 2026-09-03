import cors from "@fastify/cors";
import Fastify from "fastify";
import { resolve } from "node:path";
import { AgentRegistry } from "./registry.js";
import { ZetroDispatcher } from "./dispatcher.js";
import { registerZetro } from "./index.js";

export function buildZetroApp(options: { dispatcher?: ZetroDispatcher } = {}) {
  const app = Fastify({ logger: true });
  const registryFile = resolve(import.meta.dirname, "../../../../apps/agent-crew/docker/zetro-agents.example.json");
  const dispatcher = options.dispatcher ?? new ZetroDispatcher(AgentRegistry.fromEnvironment(registryFile));
  void app.register(cors, { origin: ["http://127.0.0.1:5173", "http://127.0.0.1:5175"] });
  app.get("/health", async () => ({ status: "ok", service: "zetro" }));
  registerZetro(app, dispatcher);
  return app;
}

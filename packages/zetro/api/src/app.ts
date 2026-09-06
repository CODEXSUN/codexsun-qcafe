import cors from "@fastify/cors";
import { registerIdentityAccess } from "./identity-access.js";
import { registerAiTaskRoutes, RulePlanner, SqliteTaskRepository, TaskService, type TaskWorker } from "@codexsun/ai-task-api";
import Fastify from "fastify";
import { resolve } from "node:path";
import { AgentRegistry } from "./registry.js";
import { ZetroDispatcher } from "./dispatcher.js";
import { registerZetro } from "./index.js";
import { RunEngine } from "./runs.js";
import { registerRunRoutes } from "./run-routes.js";
import { WorkspaceStore } from "./workspace-store.js";
import { registerWorkspaceRoutes } from "./workspace-routes.js";
import { KnowledgeLoop } from "@codexsun/zetro-knowledge";
import { registerKnowledgeRoutes } from "./knowledge-routes.js";

export function buildZetroApp(options: { dispatcher?: ZetroDispatcher } = {}) {
  const app = Fastify({ logger: true, bodyLimit: 3_000_000 });
  registerIdentityAccess(app);
  const registryFile = resolve(import.meta.dirname, "../../../../apps/agent-crew/docker/zetro-agents.example.json");
  const dispatcher = options.dispatcher ?? new ZetroDispatcher(AgentRegistry.fromEnvironment(registryFile));
  const defaultAgentId = dispatcher.registry.endpoints[0]?.id ?? "zetro";
  void app.register(cors, { origin: ["http://127.0.0.1:5173", "http://127.0.0.1:5175"] });
  app.get("/health", async () => ({ status: "ok", service: "zetro" }));
  const knowledge = !options.dispatcher ? new KnowledgeLoop(process.env.ZETRO_KNOWLEDGE_DATABASE_FILE ?? resolve(import.meta.dirname, "../state/knowledge.db")) : undefined;
  registerZetro(app, dispatcher, knowledge);
  if (!options.dispatcher) {
    const workspaceStore = new WorkspaceStore(process.env.ZETRO_WORKSPACE_DATABASE_FILE ?? resolve(import.meta.dirname, "../state/workspace.db"), {
      repositoryRoot: process.env.ZETRO_PROJECTS_ROOT || process.cwd(), githubUrl: "", enabledAgentIds: [defaultAgentId], defaultAgentId,
    }, process.env.ZETRO_SETTINGS_FILE || undefined);
    registerWorkspaceRoutes(app, workspaceStore, () => dispatcher.registry.health());
    registerKnowledgeRoutes(app, knowledge!, process.env.ZETRO_PROJECTS_ROOT || process.cwd());
    registerRunRoutes(app, new RunEngine(dispatcher, process.env.ZETRO_DATABASE_FILE ?? resolve(import.meta.dirname, "../state/zetro.db")));
    const worker: TaskWorker = {
      agents: async () => dispatcher.registry.list(),
      execute: async (agentId, instruction) => (await dispatcher.send(agentId, { message: instruction })).message,
    };
    registerAiTaskRoutes(app, new TaskService(new SqliteTaskRepository(process.env.AI_TASK_DATABASE_FILE ?? resolve(import.meta.dirname, "../state/ai-tasks.db")), new RulePlanner(), worker));
  }
  return app;
}

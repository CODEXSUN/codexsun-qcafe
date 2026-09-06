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
import { WorkCaseStore } from "./work-case-store.js";
import { registerWorkCaseRoutes } from "./work-case-routes.js";
import type { WorkCaseStatus } from "./work-case-contracts.js";
import { registerReleaseHandoffRoutes } from "./release-handoff-routes.js";

export function buildZetroApp(options: { dispatcher?: ZetroDispatcher } = {}) {
  const app = Fastify({ logger: true, bodyLimit: 3_000_000 });
  registerIdentityAccess(app);
  const registryFile = resolve(import.meta.dirname, "../../../../apps/agent-crew/docker/zetro-agents.example.json");
  const dispatcher = options.dispatcher ?? new ZetroDispatcher(AgentRegistry.fromEnvironment(registryFile));
  const defaultAgentId = dispatcher.registry.endpoints[0]?.id ?? "zetro";
  void app.register(cors, { origin: ["http://127.0.0.1:5173", "http://127.0.0.1:5175", "http://tauri.localhost", "https://tauri.localhost", "tauri://localhost"] });
  app.get("/health", async () => ({ status: "ok", service: "zetro" }));
  const knowledge = !options.dispatcher ? new KnowledgeLoop(process.env.ZETRO_KNOWLEDGE_DATABASE_FILE ?? resolve(import.meta.dirname, "../state/knowledge.db")) : undefined;
  const databaseFile = process.env.ZETRO_DATABASE_FILE ?? resolve(import.meta.dirname, "../state/zetro.db");
  const workCases = !options.dispatcher ? new WorkCaseStore(databaseFile) : undefined;
  registerZetro(app, dispatcher, knowledge, workCases);
  if (!options.dispatcher) {
    const workspaceStore = new WorkspaceStore(process.env.ZETRO_WORKSPACE_DATABASE_FILE ?? resolve(import.meta.dirname, "../state/workspace.db"), {
      repositoryRoot: process.env.ZETRO_PROJECTS_ROOT || process.cwd(), githubUrl: "", enabledAgentIds: [defaultAgentId], defaultAgentId,
    }, process.env.ZETRO_SETTINGS_FILE || undefined);
    registerWorkspaceRoutes(app, workspaceStore, () => dispatcher.registry.health());
    registerKnowledgeRoutes(app, knowledge!, process.env.ZETRO_PROJECTS_ROOT || process.cwd());
    registerWorkCaseRoutes(app, workCases!);
    registerRunRoutes(app, new RunEngine(dispatcher, databaseFile, (payload) => {
      if (!payload.run.workCaseId) return;
      workCases!.record(payload.run.workCaseId, payload.event, { status: runStatus(payload.event), details: { runId: payload.runId, ...payload.details } });
    }), workCases);
    const worker: TaskWorker = {
      agents: async () => dispatcher.registry.list(),
      execute: async (agentId, instruction) => (await dispatcher.send(agentId, { message: instruction })).message,
    };
    const taskService = new TaskService(new SqliteTaskRepository(process.env.AI_TASK_DATABASE_FILE ?? resolve(import.meta.dirname, "../state/ai-tasks.db")), new RulePlanner(), worker, {
      validate(workCaseId) {
        if (!workCases!.get(workCaseId)) throw new Error("Work case was not found.");
      },
      record(task, event, details) {
        if (!task.workCaseId) return;
        const reference = event === "task.planned" ? { kind: "task" as const, id: task.id } : undefined;
        workCases!.record(task.workCaseId, event, { status: taskStatus(task.status), reference, details: { taskId: task.id, ...details } });
        if (event === "work.completed") knowledge!.enqueue("evidence", { summary: "AI Task work item completed.", workCaseId: task.workCaseId, taskId: task.id, ...details });
        if (event === "task.completed") {
          knowledge!.enqueue("task", { summary: task.title, workCaseId: task.workCaseId, taskId: task.id, status: task.status });
          knowledge!.enqueue("learning-proposal", { summary: `Review completed task ${task.title} for reusable project learning.`, workCaseId: task.workCaseId, taskId: task.id });
          knowledge!.drain();
        }
      },
    });
    registerAiTaskRoutes(app, taskService);
    registerReleaseHandoffRoutes(app, taskService, workCases!);
  }
  return app;
}

function runStatus(event: string): WorkCaseStatus | undefined {
  if (event === "run.started" || event === "task.started") return "executing";
  if (event === "approval.requested") return "awaiting_review";
  if (event === "run.completed") return "completed";
  if (event === "run.failed" || event === "task.failed" || event === "run.interrupted") return "failed";
  return undefined;
}

function taskStatus(status: string): WorkCaseStatus {
  if (status === "planned") return "planning";
  if (status === "running") return "executing";
  if (status === "awaiting_review") return "awaiting_review";
  if (status === "completed") return "completed";
  return status === "failed" ? "failed" : "open";
}

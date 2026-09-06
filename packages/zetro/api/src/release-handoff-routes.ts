import type { TaskService } from "@codexsun/ai-task-api";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { WorkCaseStore } from "./work-case-store.js";

const releaseHandoffSchema = z.object({
  projectKey: z.string().trim().min(2).max(120),
  repository: z.string().trim().min(1).max(500).optional(),
  title: z.string().trim().min(3).max(160).optional(),
}).strict();

export function registerReleaseHandoffRoutes(app: FastifyInstance, tasks: TaskService, workCases: WorkCaseStore) {
  app.post<{ Params: { id: string } }>("/api/v1/ai-tasks/:id/release", async (request, reply) => {
    const input = releaseHandoffSchema.safeParse(request.body);
    if (!input.success) return reply.code(400).send({ error: "Provide a project key and optional repository." });
    const task = tasks.get(request.params.id);
    if (!task) return reply.code(404).send({ error: "Task was not found." });
    if (task.status !== "completed") return reply.code(409).send({ error: "Approve the completed task evidence before preparing a release." });

    try {
      const operation = await createOrshipOperation({
        target: { projectKey: input.data.projectKey, repository: input.data.repository, environment: "cloud" },
        title: input.data.title ?? task.title,
        aiTaskId: task.id,
        approvalRequired: true,
        clientRequestId: task.id,
      });
      if (task.workCaseId) workCases.record(task.workCaseId, "release.planned", { status: "release_planned", reference: { kind: "release", id: operation.id }, details: { taskId: task.id, projectKey: input.data.projectKey } });
      return reply.code(201).send(operation);
    } catch (cause) {
      return reply.code(502).send({ error: cause instanceof Error ? cause.message : "Orship is unavailable." });
    }
  });
}

async function createOrshipOperation(body: Record<string, unknown>) {
  const baseUrl = process.env.ORSHIP_API_URL ?? "http://127.0.0.1:4190";
  const token = process.env.ORSHIP_SERVICE_TOKEN?.trim();
  const response = await fetch(`${baseUrl.replace(/\/$/u, "")}/api/v1/orship`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  const payload = await response.json() as { id?: string; error?: string };
  if (!response.ok || !payload.id) throw new Error(payload.error ?? `Orship returned HTTP ${response.status}.`);
  return { ...payload, id: payload.id };
}

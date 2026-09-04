import type { FastifyInstance } from "fastify";
import { createAiTaskSchema } from "@codexsun/ai-task-contracts";
import type { TaskService } from "../application/task-service.js";

export function registerAiTaskRoutes(app: FastifyInstance, service: TaskService) {
  app.get("/api/v1/ai-tasks", async () => service.list());
  app.get<{ Params: { id: string } }>("/api/v1/ai-tasks/:id", async (request, reply) => service.get(request.params.id) ?? reply.code(404).send({ error: "Task was not found." }));
  app.post("/api/v1/ai-tasks", async (request, reply) => {
    const parsed = createAiTaskSchema.safeParse(request.body); if (!parsed.success) return reply.code(400).send({ error: "Provide a clear task request." });
    try { return await service.create(parsed.data); } catch (cause) { return reply.code(503).send({ error: message(cause) }); }
  });
  app.post<{ Params: { id: string } }>("/api/v1/ai-tasks/:id/start", async (request, reply) => { try { return service.start(request.params.id); } catch (cause) { return reply.code(409).send({ error: message(cause) }); } });
  app.post<{ Params: { id: string } }>("/api/v1/ai-tasks/:id/approve", async (request, reply) => { try { return service.approve(request.params.id); } catch (cause) { return reply.code(409).send({ error: message(cause) }); } });
  app.addHook("onClose", async () => service.close());
}
function message(cause: unknown) { return cause instanceof Error ? cause.message : "Task operation failed."; }

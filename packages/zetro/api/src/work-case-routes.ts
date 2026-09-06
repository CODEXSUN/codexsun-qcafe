import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { WorkCaseStore } from "./work-case-store.js";

const createWorkCaseSchema = z.object({ request: z.string().trim().min(1).max(20_000), conversationId: z.string().uuid().optional() }).strict();

export function registerWorkCaseRoutes(app: FastifyInstance, store: WorkCaseStore) {
  app.get("/api/v1/zetro/work-cases", async () => store.list());
  app.get<{ Params: { id: string } }>("/api/v1/zetro/work-cases/:id", async (request, reply) => store.get(request.params.id) ?? reply.code(404).send({ error: "Work case was not found." }));
  app.get<{ Params: { id: string } }>("/api/v1/zetro/work-cases/:id/events", async (request, reply) => store.get(request.params.id) ? store.events(request.params.id) : reply.code(404).send({ error: "Work case was not found." }));
  app.post("/api/v1/zetro/work-cases", async (request, reply) => {
    const parsed = createWorkCaseSchema.safeParse(request.body);
    return parsed.success ? reply.code(201).send(store.create(parsed.data.request, parsed.data.conversationId)) : reply.code(400).send({ error: "Provide a valid work request." });
  });
  app.addHook("onClose", async () => store.close());
}

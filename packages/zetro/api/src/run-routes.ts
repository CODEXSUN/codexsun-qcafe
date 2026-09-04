import type { FastifyInstance } from "fastify";
import { approvalInputSchema, runInputSchema } from "./run-contracts.js";
import type { RunEngine } from "./runs.js";

export function registerRunRoutes(app: FastifyInstance, engine: RunEngine) {
  app.addHook("onClose", async () => engine.close());
  app.get("/api/v1/zetro/runs", async () => engine.list());
  app.post<{ Params: { id: string } }>("/api/v1/zetro/runs/:id/resume", async (request, reply) => {
    try { return reply.code(202).send(engine.resume(request.params.id)); }
    catch (cause) { return reply.code(409).send({ error: cause instanceof Error ? cause.message : "Unable to resume." }); }
  });
  app.get<{ Params: { id: string } }>("/api/v1/zetro/runs/:id", async (request, reply) => engine.get(request.params.id) ?? reply.code(404).send({ error: "Run not found." }));
  app.post<{ Params: { id: string } }>("/api/v1/zetro/runs/:id/approval", async (request, reply) => {
    const input = approvalInputSchema.safeParse(request.body);
    if (!input.success) return reply.code(400).send({ error: "Provide approve or reject." });
    try { return reply.code(202).send(engine.approve(request.params.id, input.data.decision, input.data.note)); }
    catch (cause) { return reply.code(409).send({ error: cause instanceof Error ? cause.message : "Unable to decide approval." }); }
  });
  app.post("/api/v1/zetro/runs", async (request, reply) => {
    const input = runInputSchema.safeParse(request.body);
    if (!input.success) return reply.code(400).send({ error: "Provide a request and up to eight agent identities." });
    try { return reply.code(202).send(engine.create(input.data)); }
    catch (cause) { return reply.code(409).send({ error: cause instanceof Error ? cause.message : "Unable to start run." }); }
  });
}

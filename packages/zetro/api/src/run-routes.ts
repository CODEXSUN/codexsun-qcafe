import type { FastifyInstance } from "fastify";
import { runInputSchema } from "./run-contracts.js";
import type { RunEngine } from "./runs.js";

export function registerRunRoutes(app: FastifyInstance, engine: RunEngine) {
  app.get("/api/v1/zetro/runs", async () => engine.list());
  app.post<{ Params: { id: string } }>("/api/v1/zetro/runs/:id/resume", async (request, reply) => {
    try { return reply.code(202).send(engine.resume(request.params.id)); }
    catch (cause) { return reply.code(409).send({ error: cause instanceof Error ? cause.message : "Unable to resume." }); }
  });
  app.post("/api/v1/zetro/runs", async (request, reply) => {
    const input = runInputSchema.safeParse(request.body);
    if (!input.success) return reply.code(400).send({ error: "Provide a request and up to eight agent identities." });
    try { return reply.code(202).send(engine.create(input.data)); }
    catch (cause) { return reply.code(409).send({ error: cause instanceof Error ? cause.message : "Unable to start run." }); }
  });
}

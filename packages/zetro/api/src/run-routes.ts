import type { FastifyInstance } from "fastify";
import { approvalInputSchema, runInputSchema } from "./run-contracts.js";
import type { RunEngine } from "./runs.js";
import type { WorkCaseStore } from "./work-case-store.js";

export function registerRunRoutes(app: FastifyInstance, engine: RunEngine, workCases?: WorkCaseStore) {
  app.addHook("onClose", async () => engine.close());
  app.get("/api/v1/zetro/runs", async () => engine.list());
  app.post<{ Params: { id: string } }>("/api/v1/zetro/runs/:id/resume", async (request, reply) => {
    try { return reply.code(202).send(engine.resume(request.params.id)); }
    catch (cause) { return reply.code(409).send({ error: cause instanceof Error ? cause.message : "Unable to resume." }); }
  });
  app.post<{ Params: { id: string } }>("/api/v1/zetro/runs/:id/cancel", async (request, reply) => {
    try { return reply.code(202).send(engine.cancel(request.params.id)); }
    catch (cause) { return reply.code(409).send({ error: cause instanceof Error ? cause.message : "Unable to cancel." }); }
  });
  app.get<{ Params: { id: string } }>("/api/v1/zetro/runs/:id", async (request, reply) => engine.get(request.params.id) ?? reply.code(404).send({ error: "Run not found." }));
  app.get<{ Params: { id: string } }>("/api/v1/zetro/runs/:id/events", async (request, reply) => {
    const run = engine.get(request.params.id);
    if (!run) return reply.code(404).send({ error: "Run not found." });

    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    });

    reply.raw.write(`event: run\ndata: ${JSON.stringify(run)}\n\n`);

    if (["completed", "failed", "cancelled", "interrupted"].includes(run.status)) {
      reply.raw.end();
      return;
    }

    const unsubscribe = engine.subscribe(request.params.id, (payload) => {
      reply.raw.write(`event: ${payload.event}\ndata: ${JSON.stringify(payload.run)}\n\n`);
      if (["completed", "failed", "cancelled", "interrupted"].includes(payload.run.status)) {
        unsubscribe();
        reply.raw.end();
      }
    });

    request.raw.on("close", () => {
      unsubscribe();
    });
  });
  app.post<{ Params: { id: string } }>("/api/v1/zetro/runs/:id/approval", async (request, reply) => {
    const input = approvalInputSchema.safeParse(request.body);
    if (!input.success) return reply.code(400).send({ error: "Provide approve or reject." });
    try { return reply.code(202).send(engine.approve(request.params.id, input.data.decision, input.data.note)); }
    catch (cause) { return reply.code(409).send({ error: cause instanceof Error ? cause.message : "Unable to decide approval." }); }
  });
  app.post("/api/v1/zetro/runs", async (request, reply) => {
    const input = runInputSchema.safeParse(request.body);
    if (!input.success) return reply.code(400).send({ error: "Provide a request and up to eight agent identities." });
    try {
      if (input.data.workCaseId && !workCases?.get(input.data.workCaseId)) return reply.code(404).send({ error: "Work case was not found." });
      const workCaseId = input.data.workCaseId ?? workCases?.create(input.data.message).id;
      const run = engine.create({ ...input.data, workCaseId });
      if (workCaseId) workCases?.record(workCaseId, "run.linked", { status: "planning", reference: { kind: "run", id: run.id } });
      return reply.code(202).send(run);
    }
    catch (cause) { return reply.code(409).send({ error: cause instanceof Error ? cause.message : "Unable to start run." }); }
  });
}

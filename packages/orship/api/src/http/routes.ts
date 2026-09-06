import type { FastifyInstance } from "fastify";
import { createReleaseOperationSchema } from "@codexsun/orship-contracts";
import type { ReleaseOperationService } from "../application/release-operation-service.js";

export function registerReleaseOperationRoutes(app: FastifyInstance, service: ReleaseOperationService) {
  app.get("/api/v1/orship", async () => service.list());
  app.get("/api/v1/orship/events", async () => service.listEvents());
  app.get<{ Params: { id: string } }>("/api/v1/orship/:id", async (request, reply) => service.get(request.params.id) ?? reply.code(404).send({ error: "Release operation was not found." }));
  app.post("/api/v1/orship", async (request, reply) => {
    const parsed = createReleaseOperationSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Provide a project, environment, and release title." });
    try { return await service.create(parsed.data); } catch (cause) { return reply.code(409).send({ error: message(cause) }); }
  });
  app.post<{ Params: { id: string } }>("/api/v1/orship/:id/approve", async (request, reply) => replyTransition(reply, () => service.approve(request.params.id)));
  app.post<{ Params: { id: string }; Body: { version?: string } }>("/api/v1/orship/:id/publish", async (request, reply) => {
    const version = request.body?.version?.trim();
    if (!version) return reply.code(400).send({ error: "Provide a release version." });
    return replyTransition(reply, () => service.publish(request.params.id, version));
  });
  app.post<{ Params: { id: string } }>("/api/v1/orship/:id/deployment/start", async (request, reply) => replyTransition(reply, () => service.beginDeployment(request.params.id)));
  app.post<{ Params: { id: string } }>("/api/v1/orship/:id/deployment/complete", async (request, reply) => replyTransition(reply, () => service.completeDeployment(request.params.id)));
  app.post<{ Params: { id: string }; Body: { reason?: string } }>("/api/v1/orship/:id/fail", async (request, reply) => {
    const reason = request.body?.reason?.trim();
    if (!reason) return reply.code(400).send({ error: "Provide a failure reason." });
    return replyTransition(reply, () => service.fail(request.params.id, reason));
  });
  app.addHook("onClose", async () => service.close());
}

async function replyTransition(reply: { code(status: number): { send(payload: unknown): unknown } }, action: () => Promise<unknown>) {
  try { return await action(); } catch (cause) { return reply.code(409).send({ error: message(cause) }); }
}

function message(cause: unknown) { return cause instanceof Error ? cause.message : "Release operation failed."; }

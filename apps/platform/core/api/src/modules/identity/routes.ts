import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { IdentityService } from "./service.js";

const loginSchema = z.object({ login: z.string().min(1), password: z.string().min(1) });
const refreshSchema = z.object({ refreshToken: z.string().min(1) });

export function registerIdentityRoutes(app: FastifyInstance, service: IdentityService): void {
  app.post("/api/v1/identity/login", async (request, reply) => {
    const result = await service.login(loginSchema.parse(request.body));
    return reply.code(201).send(result);
  });
  app.post("/api/v1/identity/refresh", async (request, reply) => reply.send(await service.refresh(refreshSchema.parse(request.body).refreshToken)));
  app.post("/api/v1/identity/sessions/:sessionId/revoke", async (request, reply) => {
    await service.revoke(z.object({ sessionId: z.string().uuid() }).parse(request.params).sessionId);
    return reply.code(204).send();
  });
}

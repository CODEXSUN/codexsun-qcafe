import type { FastifyInstance } from "fastify";
import type { PlatformHostAdapter } from "@codexsun/platform-host-contracts";
import type { AppRegistryService } from "./app-registry.service.js";
import { extractBearerToken, requireAuthorization } from "../../auth/host-auth.js";

export function registerAppRegistryRoutes(
  app: FastifyInstance,
  service: AppRegistryService,
  host?: PlatformHostAdapter
): void {
  // GET /api/v1/registry
  app.get("/api/v1/registry", async (request) => {
    let actor;
    const token = extractBearerToken(request.headers.authorization);
    if (token && host) {
      try {
        const context = await host.authenticate(token);
        actor = context.actor;
      } catch {
        // Fall back to anonymous view if token invalid
      }
    }
    return service.getOverview(actor);
  });

  // GET /api/v1/registry/apps/:applicationId
  app.get<{ Params: { applicationId: string } }>("/api/v1/registry/apps/:applicationId", async (request, reply) => {
    let actor;
    const token = extractBearerToken(request.headers.authorization);
    if (token && host) {
      try {
        const context = await host.authenticate(token);
        actor = context.actor;
      } catch {
        // Fall back to anonymous view if token invalid
      }
    }
    const detail = await service.getApplicationDetail(request.params.applicationId, actor);
    if (!detail) return reply.code(404).send({ error: `Application ${request.params.applicationId} not found.` });
    return detail;
  });

  if (host) {
    const requireAdmin = requireAuthorization(host, "app-registry.admin");

    // POST /api/v1/registry/apps/:applicationId/state
    app.post<{ Body: { enabled: boolean }; Params: { applicationId: string } }>(
      "/api/v1/registry/apps/:applicationId/state",
      { preHandler: requireAdmin },
      async (request, reply) => {
        const token = extractBearerToken(request.headers.authorization)!;
        const context = await host.authenticate(token);
        const { enabled } = request.body ?? {};
        if (typeof enabled !== "boolean") {
          return reply.code(400).send({ error: "Property 'enabled' must be a boolean." });
        }
        try {
          const updated = await service.setApplicationState(request.params.applicationId, enabled, context.actor);
          return updated;
        } catch (error) {
          return reply.code(400).send({ error: (error as Error).message });
        }
      }
    );

    // POST /api/v1/registry/apps/:applicationId/override
    app.post<{ Body: { displayName?: string; notes?: string }; Params: { applicationId: string } }>(
      "/api/v1/registry/apps/:applicationId/override",
      { preHandler: requireAdmin },
      async (request, reply) => {
        const token = extractBearerToken(request.headers.authorization)!;
        const context = await host.authenticate(token);
        const { displayName, notes } = request.body ?? {};
        try {
          const updated = await service.setApplicationOverride(
            request.params.applicationId,
            { displayName, notes },
            context.actor
          );
          return updated;
        } catch (error) {
          return reply.code(400).send({ error: (error as Error).message });
        }
      }
    );

    // POST /api/v1/registry/runtime/:serviceId/action
    app.post<{ Body: { action: "restart" | "stop" }; Params: { serviceId: string } }>(
      "/api/v1/registry/runtime/:serviceId/action",
      { preHandler: requireAdmin },
      async (request, reply) => {
        const token = extractBearerToken(request.headers.authorization)!;
        const context = await host.authenticate(token);
        const { action } = request.body ?? {};
        if (action !== "restart" && action !== "stop") {
          return reply.code(400).send({ error: "Action must be 'restart' or 'stop'." });
        }
        try {
          const result = await service.triggerRuntimeAction(request.params.serviceId, action, context.actor);
          return result;
        } catch (error) {
          return reply.code(400).send({ error: (error as Error).message });
        }
      }
    );
  }
}

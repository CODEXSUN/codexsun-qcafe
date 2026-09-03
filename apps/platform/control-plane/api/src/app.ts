import cors from "@fastify/cors";
import Fastify from "fastify";
import { ControlPlane } from "@codexsun/runtime";
import { z } from "zod";
import { BuilderAgent } from "./builder-agent.js";
import { platformManifests } from "./manifests.js";

export function buildApp() {
  const app = Fastify({ logger: true });
  const controlPlane = new ControlPlane();
  const builderAgent = new BuilderAgent();

  for (const manifest of platformManifests) controlPlane.registry.register(manifest);
  controlPlane.registry.validateDependencies();

  void app.register(cors, { origin: true });

  app.get("/health", async () => ({ status: "ok" }));
  app.get("/api/v1/control-plane", async () => controlPlane.snapshot());
  app.post("/api/v1/agents/builder/runs", async (request, reply) => {
    const input = z.object({ objective: z.string().min(10).max(4_000) }).parse(request.body);
    if (!builderAgent.isConfigured()) {
      return reply.code(503).send({ error: "The builder agent needs OPENAI_API_KEY." });
    }
    return builderAgent.plan(input.objective);
  });

  return app;
}

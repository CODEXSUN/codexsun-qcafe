import cors from "@fastify/cors";
import Fastify from "fastify";
import { ControlPlane } from "@codexsun/runtime";
import { z } from "zod";
import { chatMessageInputSchema } from "@codexsun/contracts";
import { BuilderAgent } from "./builder-agent.js";
import { ChatService, UnknownConversationError } from "./chat/chat-service.js";
import { CodexSidecar } from "./chat/codex-sidecar.js";
import { platformManifests } from "./manifests.js";

export function buildApp(options: { chatService?: ChatService } = {}) {
  const app = Fastify({ logger: true });
  const controlPlane = new ControlPlane();
  const builderAgent = new BuilderAgent();
  const chatService = options.chatService ?? new ChatService(new CodexSidecar());

  for (const manifest of platformManifests) controlPlane.registry.register(manifest);
  controlPlane.registry.validateDependencies();

  void app.register(cors, { origin: true });

  app.get("/health", async () => ({ status: "ok" }));
  app.get("/api/v1/control-plane", async () => controlPlane.snapshot());
  app.post("/api/v1/chat/messages", async (request, reply) => {
    const input = chatMessageInputSchema.parse(request.body);
    try {
      return await chatService.send(input);
    } catch (error) {
      if (error instanceof UnknownConversationError) return reply.code(409).send({ error: error.message });
      request.log.error(error);
      return reply.code(502).send({ error: "The Codex sidecar could not complete this turn." });
    }
  });
  app.post("/api/v1/agents/builder/runs", async (request, reply) => {
    const input = z.object({ objective: z.string().min(10).max(4_000) }).parse(request.body);
    if (!builderAgent.isConfigured()) {
      return reply.code(503).send({ error: "The builder agent needs OPENAI_API_KEY." });
    }
    return builderAgent.plan(input.objective);
  });

  return app;
}

import type { FastifyInstance } from "fastify";
import type { KnowledgeLoop } from "@codexsun/zetro-knowledge";
import { dispatchInputSchema } from "./contracts.js";
import { DispatchError, ZetroDispatcher } from "./dispatcher.js";
import { AgentRegistry } from "./registry.js";

export { AgentRegistry } from "./registry.js";
export { ZetroDispatcher } from "./dispatcher.js";
export { registerKnowledgeRoutes } from "./knowledge-routes.js";
export function registerZetro(app: FastifyInstance, dispatcher = new ZetroDispatcher(AgentRegistry.fromEnvironment()), knowledge?: KnowledgeLoop) {
  app.get("/api/v1/zetro/agents", async () => dispatcher.registry.health());
  app.post("/api/v1/zetro/messages", async (request, reply) => {
    const result = dispatchInputSchema.safeParse(request.body);
    if (!result.success) return reply.code(400).send({ error: "Select an agent and provide a valid message." });
    try {
      const { agentId, ...input } = result.data;
      knowledge?.enqueue("prompt", { summary: input.message, conversationId: input.conversationId, agentId });
      knowledge?.enqueue("plan", { summary: "Dispatch read-only evidence before implementation.", conversationId: input.conversationId, agentId });
      knowledge?.drain();
      const turn = await dispatcher.send(agentId, input);
      knowledge?.enqueue("evidence", { summary: turn.message, conversationId: turn.conversationId, agentId, activities: turn.activities, usage: turn.usage });
      knowledge?.enqueue("learning-proposal", { summary: "Review this completed run for reusable lessons; operator approval is required.", conversationId: turn.conversationId, evidenceRunId: turn.runId });
      knowledge?.drain();
      return turn;
    } catch (error) {
      return reply.code(error instanceof DispatchError ? error.status : 502).send({
        error: error instanceof DispatchError ? error.message : "The selected agent is unavailable.",
      });
    }
  });
}

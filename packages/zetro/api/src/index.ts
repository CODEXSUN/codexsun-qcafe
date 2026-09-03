import type { FastifyInstance } from "fastify";
import { dispatchInputSchema } from "./contracts.js";
import { DispatchError, ZetroDispatcher } from "./dispatcher.js";
import { AgentRegistry } from "./registry.js";

export { AgentRegistry } from "./registry.js";
export { ZetroDispatcher } from "./dispatcher.js";
export function registerZetro(app: FastifyInstance, dispatcher = new ZetroDispatcher(AgentRegistry.fromEnvironment())) {
  app.get("/api/v1/zetro/agents", async () => dispatcher.registry.list());
  app.post("/api/v1/zetro/messages", async (request, reply) => {
    const result = dispatchInputSchema.safeParse(request.body);
    if (!result.success) return reply.code(400).send({ error: "Select an agent and provide a valid message." });
    try {
      const { agentId, ...input } = result.data;
      return await dispatcher.send(agentId, input);
    } catch (error) {
      return reply.code(error instanceof DispatchError ? error.status : 502).send({
        error: error instanceof DispatchError ? error.message : "The selected agent is unavailable.",
      });
    }
  });
}

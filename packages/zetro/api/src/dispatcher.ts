import { turnSchema, type MessageInput } from "./contracts.js";
import { AgentRegistry } from "./registry.js";

export class DispatchError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

export class ZetroDispatcher {
  constructor(readonly registry: AgentRegistry, private readonly transport: typeof fetch = fetch) {}

  async send(agentId: string, input: MessageInput) {
    const agent = this.registry.endpoints.find((entry) => entry.id === agentId);
    if (!agent) throw new DispatchError(404, "This agent is not registered.");
    const token = this.registry.env[agent.tokenEnv];
    if (!token) throw new DispatchError(503, "This agent connection needs operator configuration.");
    const response = await this.transport(new URL("/api/v1/messages", agent.url), {
      method: "POST", redirect: "error", signal: AbortSignal.timeout(125_000),
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    if (response.status === 409) throw new DispatchError(409, "Start a new conversation or wait for the current agent turn.");
    if (response.status === 503) throw new DispatchError(503, "The agent model provider is not configured.");
    if (!response.ok) throw new DispatchError(502, "The selected agent could not complete this turn.");
    const turn = turnSchema.parse(await response.json());
    if (turn.agentId !== agentId || (input.conversationId && turn.conversationId !== input.conversationId)) {
      throw new DispatchError(502, "The agent response identity did not match the request.");
    }
    return turn;
  }
}

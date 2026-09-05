import { platformFetch } from "@codexsun/platform-host-contracts";
import type { AgentTurn, PromptAttachment } from "@codexsun/zetro-api/contracts";

export async function sendPrompt({ agentId, message, signal, attachments }: { agentId: string; message: string; signal: AbortSignal; attachments?: PromptAttachment[] }): Promise<AgentTurn> {
  const response = await platformFetch(`${import.meta.env.VITE_ZETRO_API_URL ?? ""}/api/v1/zetro/messages`, {
    method: "POST", signal, headers: { "content-type": "application/json" },
    body: JSON.stringify({ agentId, message, attachments }),
  });
  const result = await response.json() as AgentTurn & { error?: string };
  if (!response.ok || result.error) throw new Error(result.error ?? "Zetro could not respond. Try again.");
  return result;
}

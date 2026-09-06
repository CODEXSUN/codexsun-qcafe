import { platformFetch } from "@codexsun/platform-host-contracts";
import type { AgentTurn, PromptAttachment } from "@codexsun/zetro-api/contracts";
import { isDesktopZetro, sendDesktopZetroPrompt } from "./desktop-bridge.js";

export async function sendPrompt({
  agentId,
  conversationId,
  message,
  signal,
  attachments,
  provider,
  model,
}: {
  agentId: string;
  conversationId: string;
  message: string;
  signal: AbortSignal;
  attachments?: PromptAttachment[];
  provider?: string;
  model?: string;
}): Promise<AgentTurn> {
  if (isDesktopZetro()) {
    if (signal.aborted) throw new DOMException("The request was cancelled.", "AbortError");
    return sendDesktopZetroPrompt({ agentId: "zxa", conversationId, message, attachments, provider, model });
  }
  const response = await platformFetch(`${import.meta.env.VITE_ZETRO_API_URL ?? ""}/api/v1/zetro/messages`, {
    method: "POST", signal, headers: { "content-type": "application/json" },
    body: JSON.stringify({ agentId, conversationId, message, attachments, provider, model }),
  });
  const result = await response.json() as AgentTurn & { error?: string };
  if (!response.ok || result.error) throw new Error(result.error ?? "Zetro could not respond. Try again.");
  return result;
}

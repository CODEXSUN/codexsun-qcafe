import { Codex } from "@openai/codex-sdk";
import { existsSync } from "node:fs";
import { z } from "zod";
import type { AgentTurn } from "@codexsun/zetro-api/contracts";
import type { Conversation } from "./store.js";

export type ModelResult = Pick<AgentTurn, "message" | "provider" | "usage">;
export interface ModelProvider {
  configured(): boolean;
  answer(instructions: string, conversation: Conversation): Promise<ModelResult>;
}

export class CodexProvider implements ModelProvider {
  configured() { return Boolean(process.env.OPENAI_API_KEY); }

  async answer(instructions: string, conversation: Conversation): Promise<ModelResult> {
    if (!existsSync("/.dockerenv")) throw new Error("Codex execution requires the Docker runtime.");
    const codex = new Codex({
      apiKey: process.env.OPENAI_API_KEY,
      config: { developer_instructions: instructions, features: { shell_tool: false } },
      env: { PATH: process.env.PATH ?? "", HOME: "/tmp", CODEX_HOME: "/tmp/codex" },
    });
    const thread = codex.startThread({
      model: process.env.AGENT_MODEL, modelReasoningEffort: z.enum(["low", "medium", "high"]).parse(process.env.AGENT_REASONING ?? "medium"),
      workingDirectory: "/profile", skipGitRepoCheck: true, sandboxMode: "read-only",
      approvalPolicy: "never", networkAccessEnabled: false, webSearchMode: "disabled",
    });
    const turn = await thread.run(JSON.stringify(conversation.messages), { signal: AbortSignal.timeout(120_000) });
    return {
      message: turn.finalResponse, provider: "codex",
      usage: turn.usage ? { inputTokens: turn.usage.input_tokens, outputTokens: turn.usage.output_tokens, cachedInputTokens: turn.usage.cached_input_tokens } : null,
    };
  }
}

export class CompatibleProvider implements ModelProvider {
  configured() { return Boolean(process.env.LLM_BASE_URL && process.env.LLM_API_KEY && process.env.AGENT_MODEL); }

  async answer(instructions: string, conversation: Conversation): Promise<ModelResult> {
    const base = new URL(process.env.LLM_BASE_URL!);
    if (!["http:", "https:"].includes(base.protocol)) throw new Error("Unsupported model endpoint.");
    const response = await fetch(`${base.href.replace(/\/$/u, "")}/chat/completions`, {
      method: "POST", redirect: "error", signal: AbortSignal.timeout(120_000),
      headers: { authorization: `Bearer ${process.env.LLM_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ model: process.env.AGENT_MODEL, messages: [{ role: "system", content: instructions }, ...conversation.messages] }),
    });
    if (!response.ok) throw new Error("Model request failed.");
    const result = z.object({ choices: z.array(z.object({ message: z.object({ content: z.string().min(1) }) })).min(1) }).parse(await response.json());
    return { message: result.choices[0]!.message.content, provider: "openai-compatible", usage: null };
  }
}

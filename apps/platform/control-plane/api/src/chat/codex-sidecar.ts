import { Codex, type ThreadItem } from "@openai/codex-sdk";
import { resolve } from "node:path";
import type { ChatActivity } from "@codexsun/contracts";
import type { ChatSidecar, SidecarTurn } from "./chat-types.js";

const workspaceRoot = resolve(import.meta.dirname, "../../../../..");

export class CodexSidecar implements ChatSidecar {
  readonly #codex = new Codex();

  async send(input: { message: string; threadId?: string }): Promise<SidecarTurn> {
    const options = {
      approvalPolicy: "never" as const,
      sandboxMode: "read-only" as const,
      threadSource: "codexsun-os-chat",
      workingDirectory: workspaceRoot,
    };
    const thread = input.threadId
      ? this.#codex.resumeThread(input.threadId, options)
      : this.#codex.startThread(options);
    const turn = await thread.run(input.message);
    if (!thread.id) throw new Error("Codex did not return a thread identifier.");

    return {
      activities: turn.items.flatMap(toActivity),
      message: turn.finalResponse,
      threadId: thread.id,
      usage: turn.usage ? {
        cachedInputTokens: turn.usage.cached_input_tokens,
        inputTokens: turn.usage.input_tokens,
        outputTokens: turn.usage.output_tokens,
      } : null,
    };
  }
}

function toActivity(item: ThreadItem): ChatActivity[] {
  if (item.type === "agent_message") return [];
  if (item.type === "command_execution") return [{ id: item.id, kind: "command", label: item.command, status: item.status === "in_progress" ? "running" : item.status }];
  if (item.type === "file_change") return [{ id: item.id, kind: "file", label: `${item.changes.length} file change${item.changes.length === 1 ? "" : "s"}`, status: item.status }];
  if (item.type === "mcp_tool_call") return [{ id: item.id, kind: "tool", label: `${item.server} / ${item.tool}`, status: item.status === "in_progress" ? "running" : item.status }];
  if (item.type === "web_search") return [{ id: item.id, kind: "search", label: item.query, status: "completed" }];
  if (item.type === "todo_list") return [{ id: item.id, kind: "todo", label: `${item.items.filter((todo) => todo.completed).length}/${item.items.length} steps complete`, status: "completed" }];
  if (item.type === "reasoning") return [{ id: item.id, kind: "reasoning", label: item.text || "Reasoning summary", status: "completed" }];
  return [{ id: item.id, kind: "error", label: item.message, status: "failed" }];
}

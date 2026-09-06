import type { AgentTurn, AgentSummary } from "@codexsun/zetro-api/contracts";
import type { ZetroSettings } from "./settings-api.js";

export function isDesktopZetro(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function desktopZetroStatus(): Promise<{ status: "ok" | "degraded"; agent: "ready" | "offline" }> {
  return invoke("zetro_desk_status");
}

export async function desktopZetroSettings(): Promise<ZetroSettings> {
  return invoke("zetro_desk_settings");
}

export async function saveDesktopZetroSettings(settings: ZetroSettings): Promise<ZetroSettings> {
  return invoke("zetro_desk_save_settings", { settings });
}

export async function pickDesktopProjectFolder(): Promise<{ folder: string; absolutePath: string } | null> {
  return invoke("zetro_desk_pick_project_folder");
}

export async function desktopZetroAgents(): Promise<AgentSummary[]> {
  return invoke("zetro_desk_agents");
}

export async function sendDesktopZetroPrompt(input: { agentId: string; conversationId: string; message: string; attachments?: unknown[]; provider?: string; model?: string }): Promise<AgentTurn> {
  return invoke("zetro_desk_send_prompt", { input });
}

export async function desktopZetroCoordinator<T>(path: string, options: { method?: "GET" | "POST" | "PUT" | "DELETE"; body?: unknown } = {}): Promise<T> {
  return invoke("zetro_desk_coordinator", { input: { path, method: options.method ?? "GET", body: options.body } });
}

async function invoke<T>(command: string, arguments_: Record<string, unknown> = {}): Promise<T> {
  const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
  return tauriInvoke<T>(command, arguments_);
}

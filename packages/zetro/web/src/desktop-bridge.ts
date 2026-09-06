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

export async function desktopZetroAgents(): Promise<AgentSummary[]> {
  return invoke("zetro_desk_agents");
}

export async function sendDesktopZetroPrompt(input: { agentId: string; message: string; attachments?: unknown[] }): Promise<AgentTurn> {
  return invoke("zetro_desk_send_prompt", { input });
}

async function invoke<T>(command: string, arguments_: Record<string, unknown> = {}): Promise<T> {
  const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
  return tauriInvoke<T>(command, arguments_);
}

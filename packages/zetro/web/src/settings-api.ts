import { platformFetch } from "@codexsun/platform-host-contracts";
import type { AgentSummary } from "@codexsun/zetro-api/contracts";
import { desktopZetroAgents, desktopZetroSettings, isDesktopZetro, saveDesktopZetroSettings } from "./desktop-bridge.js";

const base = import.meta.env.VITE_ZETRO_API_URL ?? "";

export type ZetroSettings = {
  repositoryRoot: string;
  githubUrl: string;
  enabledAgentIds: string[];
  defaultAgentId: string;
};

export async function getZetroSettings(): Promise<ZetroSettings> { return isDesktopZetro() ? desktopZetroSettings() : request("/api/v1/zetro/settings"); }
export async function getZetroAgents(): Promise<AgentSummary[]> { return isDesktopZetro() ? desktopZetroAgents() : request("/api/v1/zetro/agents"); }
export async function saveZetroSettings(settings: ZetroSettings): Promise<ZetroSettings> {
  return isDesktopZetro() ? saveDesktopZetroSettings(settings) : request("/api/v1/zetro/settings", { method: "PUT", body: settings });
}

async function request<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const response = await platformFetch(`${base}${path}`, { method: options.method, headers: options.body ? { "content-type": "application/json" } : undefined, body: options.body ? JSON.stringify(options.body) : undefined });
  const text = await response.text();
  const result = text ? JSON.parse(text) as T & { error?: string } : {} as T & { error?: string };
  if (!response.ok || result.error) throw new Error(result.error ?? "Zetro settings request failed.");
  return result;
}

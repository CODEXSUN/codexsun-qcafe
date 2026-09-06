import { platformFetch } from "@codexsun/platform-host-contracts";
import { desktopZetroCoordinator, desktopZetroSettings, isDesktopZetro } from "./desktop-bridge.js";

const base = import.meta.env.VITE_ZETRO_API_URL ?? "";

export type ProviderId = "g" | "c" | "o";
export type RuntimeTarget = "local" | "docker-local" | "docker-vps";

export type ZxaProvider = {
  id: ProviderId;
  name: string;
  model: string;
  configured: boolean;
  busy?: boolean;
  activeRequests?: number;
  maxParallelRequests?: number;
  connectedAs?: string;
  connectionMethod?: string;
};

export type ZxaModelOption = {
  id: string;
  name: string;
  description?: string;
  inputTokenLimit?: number;
  outputTokenLimit?: number;
};

export type ProvidersResponse = {
  providers: ZxaProvider[];
  runtimeTarget?: RuntimeTarget;
  configureUrl?: string;
  codex?: { status: string; url?: string; code?: string; message?: string };
  geminiAuth?: { status: string; url?: string; email?: string; message?: string };
};

export type ModelsResponse = {
  provider: ProviderId;
  models: ZxaModelOption[];
  live?: boolean;
  warning?: string;
};

export const FALLBACK_PROVIDERS: ZxaProvider[] = [
  { id: "g", name: "Gemini", model: "gemini-2.5-pro", configured: false },
  { id: "o", name: "OpenCode", model: "opencode/nemotron-3-ultra-free", configured: false },
  { id: "c", name: "Codex", model: "account default", configured: false },
];

export const FALLBACK_MODELS: Record<ProviderId, ZxaModelOption[]> = {
  g: [
    { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", description: "Flagship: State-of-the-art coding & multimodal reasoning (Google Code Assist)" },
    { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", description: "Fastest & versatile multimodal reasoning" },
    { id: "gemini-3.1-pro-preview", name: "Gemini 3.1 Pro (Preview)", description: "Advanced preview reasoning" },
    { id: "gemini-3.5-flash", name: "Gemini 3.5 Flash", description: "Next-gen ultra fast performance" },
    { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", description: "High-speed multimodal with low latency" },
    { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", description: "2M token context" },
  ],
  o: [
    { id: "opencode/nemotron-3-ultra-free", name: "Nemotron 3 Ultra (Free)", description: "NVIDIA Nemotron free built-in model" },
    { id: "opencode/nemotron-3.5-lightning-free", name: "Nemotron 3.5 Lightning (Free)", description: "Ultra-fast Nemotron 3.5 free model" },
    { id: "opencode/mimo-v2.5-free", name: "Mimo v2.5 (Free)", description: "Mimo fast reasoning free model" },
    { id: "opencode/big-pickle", name: "Big Pickle (Free)", description: "Community coding model" },
  ],
  c: [
    { id: "account default", name: "Account Default", description: "Default model for connected ChatGPT account" },
    { id: "gpt-4o", name: "GPT-4o", description: "Omni model for text and vision" },
    { id: "o1", name: "o1", description: "Advanced reasoning model" },
    { id: "o3-mini", name: "o3-mini", description: "Fast reasoning model" },
  ],
};

export async function getZxaProviders(): Promise<ProvidersResponse> {
  if (isDesktopZetro()) {
    const [providers, settings] = await Promise.all([
      desktopZetroCoordinator<ProvidersResponse>("/api/v1/zetro/providers"),
      desktopZetroSettings(),
    ]);
    return {
      ...providers,
      runtimeTarget: settings.runtimeTarget,
      configureUrl: resolveZxaConfigurationUrl(settings),
    };
  }
  const response = await platformFetch(`${base}/api/v1/zetro/providers`);
  if (!response.ok) throw new Error("Failed to fetch ZXA providers.");
  return {
    ...((await response.json()) as ProvidersResponse),
    configureUrl: resolveZxaConfigurationUrl(),
  };
}

export function resolveZxaConfigurationUrl(
  settings?: { runtimeTarget: RuntimeTarget; vpsAgentUrl: string }
): string {
  if (settings?.runtimeTarget === "docker-vps" && settings.vpsAgentUrl.trim()) {
    return `${settings.vpsAgentUrl.trim().replace(/\/+$/u, "")}/`;
  }

  if (
    typeof window !== "undefined" &&
    !isDesktopZetro() &&
    !isLoopbackHost(window.location.hostname)
  ) {
    return new URL("/zxa/", window.location.origin).toString();
  }

  return "http://127.0.0.1:4230/";
}

function isLoopbackHost(hostname: string): boolean {
  return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "[::1]";
}

export async function getZxaModels(provider: ProviderId): Promise<ModelsResponse> {
  if (isDesktopZetro()) {
    return desktopZetroCoordinator<ModelsResponse>(`/api/v1/zetro/models?provider=${provider}`);
  }
  const response = await platformFetch(`${base}/api/v1/zetro/models?provider=${provider}`);
  if (!response.ok) throw new Error("Failed to fetch ZXA models.");
  return (await response.json()) as ModelsResponse;
}

export async function saveZxaProvider(
  provider: ProviderId,
  payload: { model?: string; apiKey?: string; baseUrl?: string; enabled?: boolean }
): Promise<unknown> {
  if (isDesktopZetro()) {
    return desktopZetroCoordinator(`/api/v1/zetro/providers/${provider}`, {
      method: "PUT",
      body: payload,
    });
  }
  const response = await platformFetch(`${base}/api/v1/zetro/providers/${provider}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error || "Failed to update provider connection.");
  }
  return response.json();
}

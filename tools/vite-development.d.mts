import type { ServerOptions } from "vite";

export type ViteDevelopmentOptions = Pick<ServerOptions, "host" | "port" | "proxy">;

export type ViteDevelopmentEnvironment = Partial<Record<
  | "CODEXSUN_VITE_HMR_HOST"
  | "CODEXSUN_VITE_HMR_POLLING"
  | "CODEXSUN_VITE_HMR_PORT"
  | "CODEXSUN_VITE_HMR_PROTOCOL"
  | "CODEXSUN_VITE_HOT_RELOAD",
  string
>>;

export function createViteDevelopmentServer(
  options: ViteDevelopmentOptions,
  environment?: ViteDevelopmentEnvironment,
): ServerOptions;

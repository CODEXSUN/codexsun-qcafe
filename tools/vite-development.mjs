const DEFAULT_WATCH_INTERVAL_MS = 150;
const WRITE_SETTLE_INTERVAL_MS = 75;
const WRITE_SETTLE_THRESHOLD_MS = 350;

export function createViteDevelopmentServer(options, environment = process.env) {
  const hotReload = readBoolean(environment.CODEXSUN_VITE_HOT_RELOAD, false);
  const polling = readBoolean(environment.CODEXSUN_VITE_HMR_POLLING, false);

  return {
    host: options.host,
    hmr: hotReload ? createHotReloadOptions(environment) : false,
    port: options.port,
    proxy: options.proxy,
    strictPort: true,
    watch: {
      awaitWriteFinish: {
        pollInterval: WRITE_SETTLE_INTERVAL_MS,
        stabilityThreshold: WRITE_SETTLE_THRESHOLD_MS,
      },
      ignored: ["**/dist/**"],
      interval: polling ? DEFAULT_WATCH_INTERVAL_MS : undefined,
      usePolling: polling,
    },
  };
}

function createHotReloadOptions(environment) {
  const host = readOptionalString(environment.CODEXSUN_VITE_HMR_HOST);
  const clientPort = readOptionalPort(environment.CODEXSUN_VITE_HMR_PORT);
  const protocol = readProtocol(environment.CODEXSUN_VITE_HMR_PROTOCOL);
  if (!host && !clientPort && !protocol) return true;
  return {
    ...(host ? { host } : {}),
    ...(clientPort ? { clientPort } : {}),
    ...(protocol ? { protocol } : {}),
  };
}

function readBoolean(value, fallback) {
  if (value === undefined || value === "") return fallback;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`Expected true or false, received ${value}.`);
}

function readOptionalPort(value) {
  const text = readOptionalString(value);
  if (!text) return undefined;
  const port = Number(text);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`Invalid Vite HMR port: ${text}.`);
  }
  return port;
}

function readOptionalString(value) {
  const text = value?.trim();
  return text || undefined;
}

function readProtocol(value) {
  const protocol = readOptionalString(value);
  if (!protocol) return undefined;
  if (protocol === "ws" || protocol === "wss") return protocol;
  throw new Error(`Invalid Vite HMR protocol: ${protocol}.`);
}

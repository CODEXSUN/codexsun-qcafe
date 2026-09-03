#!/usr/bin/env node

import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { runPreflight } from "./preflight.mjs";

const ROOT = resolve(import.meta.dirname, "..");
const service = process.argv[2];
const definitions = {
  api: {
    args: ["apps/platform/control-plane/api/src/server.ts"],
    bin: resolve(ROOT, "node_modules", "tsx", "dist", "cli.mjs"),
    portIndex: 0,
  },
  web: {
    args: ["apps/platform/control-plane/web", "--config", "apps/platform/control-plane/web/vite.config.ts"],
    bin: resolve(ROOT, "node_modules", "vite", "bin", "vite.js"),
    portIndex: 1,
  },
};

if (!service || !definitions[service]) {
  console.error("Usage: node tools/start-service.mjs <api|web>");
  process.exit(1);
}

const definition = definitions[service];
const { env, ports } = await runPreflight({ ports: [service === "api" ? 4100 : 5173] });
const child = spawn(process.execPath, [definition.bin, ...definition.args], {
  cwd: ROOT,
  env: { ...env, ...process.env, OS_API_PORT: String(ports[0]) },
  stdio: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => child.kill(signal));
child.once("exit", (code) => process.exit(code ?? 0));

#!/usr/bin/env node

import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getOrCreateNeotToken, neotTokenPath } from "./neot-token.mjs";

const root = resolve(import.meta.dirname, "..");
const neotEnv = loadNeotEnv(resolve(root, "apps", "neot", ".env"));
const savedToken = process.env.NEOT_API_TOKEN ?? neotEnv.NEOT_API_TOKEN ? null : getOrCreateNeotToken();
const token = process.env.NEOT_API_TOKEN ?? neotEnv.NEOT_API_TOKEN ?? savedToken?.token ?? "neot_dev_token_secret_123";
const databasePath = resolve(root, "apps", "neot", process.env.NEOT_DATABASE_PATH ?? neotEnv.NEOT_DATABASE_PATH ?? ".local/neot.sqlite");

console.log("==================================================");
console.log("             Starting NEOT LMS Platform           ");
console.log("             Learn today. Own tomorrow.           ");
console.log("==================================================");
console.log(`- Web App URL:  http://127.0.0.1:5250`);
console.log(`- API URL:      http://127.0.0.1:4250/api/v1/neot`);
console.log(`- Target Cloud: ${process.env.NEOT_CLOUD_URL ?? neotEnv.NEOT_CLOUD_URL ?? 'https://neot.in'}`);
console.log(`- Database:     ${databasePath}`);
if (savedToken) console.log(`- API Token:    Saved in ${neotTokenPath}`);
console.log("==================================================");

const env = {
  ...neotEnv,
  ...process.env,
  NEOT_API_PORT: "4250",
  NEOT_WEB_PORT: "5250",
  NEOT_API_TOKEN: token,
  NEOT_DATABASE_PATH: databasePath,
  NEOT_DEMO: process.env.NEOT_DEMO ?? "true",
};

// Start API server
const apiProcess = spawn(process.execPath, [resolve(root, "apps", "neot", "api", "src", "server.mjs")], {
  cwd: root,
  env,
  stdio: "inherit",
});

// Start Vite Web server
const viteBin = resolve(root, "node_modules", "vite", "bin", "vite.js");
const webProcess = spawn(process.execPath, [viteBin, "apps/neot/web", "--config", "apps/neot/web/vite.config.ts"], {
  cwd: root,
  env,
  stdio: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    apiProcess.kill(signal);
    webProcess.kill(signal);
  });
}

apiProcess.on("exit", (code) => {
  if (code !== 0 && code !== null) console.error(`[NEOT API] exited with code ${code}`);
});

webProcess.on("exit", (code) => {
  if (code !== 0 && code !== null) console.error(`[NEOT Web] exited with code ${code}`);
});

function loadNeotEnv(path) {
  if (!existsSync(path)) return {};
  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/u)
      .map((line) => line.match(/^\s*([^#=]+?)\s*=\s*(.*?)\s*$/u))
      .filter(Boolean)
      .map((match) => [match[1].trim(), parseEnvValue(match[2])])
  );
}

function parseEnvValue(value) {
  const trimmed = String(value ?? "").trim();
  const quote = trimmed[0];
  if ((quote === '"' || quote === "'") && trimmed.endsWith(quote)) return trimmed.slice(1, -1);
  return trimmed.replace(/\s+#.*$/u, "").trim();
}

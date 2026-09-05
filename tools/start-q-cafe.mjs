#!/usr/bin/env node

import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getOrCreateQCafeToken, qCafeTokenPath } from "./q-cafe-token.mjs";

const root = resolve(import.meta.dirname, "..");
const qCafeEnv = loadQCafeEnv(resolve(root, "apps", "q-cafe", ".env"));
const savedToken = process.env.QCAFE_API_TOKEN ?? qCafeEnv.QCAFE_API_TOKEN ? null : getOrCreateQCafeToken();
const token = process.env.QCAFE_API_TOKEN ?? qCafeEnv.QCAFE_API_TOKEN ?? savedToken.token;
const cashierPin = process.env.QCAFE_CASHIER_PIN ?? qCafeEnv.QCAFE_CASHIER_PIN ?? "1234";
const databasePath = resolve(root, "apps", "q-cafe", process.env.QCAFE_DATABASE_PATH ?? qCafeEnv.QCAFE_DATABASE_PATH ?? ".local/q-cafe.sqlite");

console.log(`Q Cafe cashier PIN: ${cashierPin}`);
if (savedToken) console.log(`Technical API token saved in ${qCafeTokenPath}`);

const child = spawn(process.execPath, [resolve(root, "tools", "dev-stack.mjs")], {
  cwd: root,
  env: {
    ...qCafeEnv,
    ...process.env,
    QCAFE_API_TOKEN: token,
    QCAFE_CASHIER_PIN: cashierPin,
    QCAFE_DATABASE_PATH: databasePath,
    QCAFE_DEMO: process.env.QCAFE_DEMO ?? "true",
    QCAFE_ONLY: "true",
  },
  stdio: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => child.kill(signal));
child.once("exit", (code) => process.exit(code ?? 0));

function loadQCafeEnv(path) {
  if (!existsSync(path)) return {};
  return Object.fromEntries(readFileSync(path, "utf8")
    .split(/\r?\n/u)
    .map((line) => line.match(/^\s*([^#=]+?)\s*=\s*(.*?)\s*$/u))
    .filter(Boolean)
    .map((match) => [match[1].trim(), parseEnvValue(match[2])]));
}

function parseEnvValue(value) {
  const trimmed = String(value ?? "").trim();
  const quote = trimmed[0];
  if ((quote === '"' || quote === "'") && trimmed.endsWith(quote)) return trimmed.slice(1, -1);
  return trimmed.replace(/\s+#.*$/u, "").trim();
}

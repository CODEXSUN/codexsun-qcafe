#!/usr/bin/env node

import { spawn } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const token = process.env.QCAFE_API_TOKEN;

if (!token) {
  console.error("QCAFE_API_TOKEN is required. Set a private operator key before you start Q Cafe.");
  process.exit(1);
}

const child = spawn(process.execPath, [resolve(root, "tools", "dev-stack.mjs")], {
  cwd: root,
  env: { ...process.env, QCAFE_ONLY: "true" },
  stdio: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => child.kill(signal));
child.once("exit", (code) => process.exit(code ?? 0));

#!/usr/bin/env node

import { spawn } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const services = ["http://127.0.0.1:4100/health", "http://127.0.0.1:4150/health", "http://127.0.0.1:5173/"];
const healthy = (await Promise.all(services.map(async (url) => {
  try { return (await fetch(url, { signal: AbortSignal.timeout(1_500) })).ok; } catch { return false; }
}))).every(Boolean);

if (healthy) {
  console.log("CODEXSUN desktop is using the existing local Node runtime.");
  setInterval(() => {}, 60_000);
} else {
  const npmCli = process.env.npm_execpath;
  if (!npmCli) throw new Error("The npm CLI path is unavailable.");
  const child = spawn(process.execPath, [npmCli, "run", "dev"], { cwd: root, env: process.env, stdio: "inherit", windowsHide: true });
  for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => child.kill(signal));
  child.once("exit", (code) => process.exit(code ?? 0));
}

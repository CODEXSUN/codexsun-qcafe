#!/usr/bin/env node

import { spawn, spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { runPreflight } from "./preflight.mjs";

const ROOT = resolve(import.meta.dirname, "..");
const services = [
  {
    args: ["apps/platform/control-plane/api/src/server.ts"],
    bin: resolve(ROOT, "node_modules", "tsx", "dist", "cli.mjs"),
    healthUrl: "http://127.0.0.1:4100/health",
    label: "api",
  },
  {
    args: ["apps/platform/control-plane/web", "--config", "apps/platform/control-plane/web/vite.config.ts"],
    bin: resolve(ROOT, "node_modules", "vite", "bin", "vite.js"),
    healthUrl: "http://127.0.0.1:5173/",
    label: "web",
  },
];
const children = new Set();
let stopping = false;

try {
  const { env } = await runPreflight();
  console.log("CODEXSUN OS development runtime");
  for (const service of services) {
    const child = startService(service, env);
    await waitForHealthyUrl(service.healthUrl, service.label);
    console.log(`  ok ${service.label} is ready`);
    child.once("exit", (code) => {
      if (!stopping && code !== 0) void shutdown(code ?? 1);
    });
  }
  console.log("\n  ok API and Web are ready");
  console.log("  - Web: http://127.0.0.1:5173");
  console.log("  - API: http://127.0.0.1:4100\n");
} catch (error) {
  console.error(`  x ${error instanceof Error ? error.message : String(error)}`);
  await shutdown(1);
}

for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => void shutdown(0));

function startService(service, env) {
  const child = spawn(process.execPath, [service.bin, ...service.args], {
    cwd: ROOT,
    env: { ...env, ...process.env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  children.add(child);
  child.stdout.on("data", (chunk) => writeLines(service.label, chunk));
  child.stderr.on("data", (chunk) => writeLines(service.label, chunk));
  child.once("exit", () => children.delete(child));
  return child;
}

async function waitForHealthyUrl(url, label) {
  const startedAt = Date.now();
  let lastStatus = "not reachable";
  while (Date.now() - startedAt < 30_000) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2_000) });
      lastStatus = `HTTP ${response.status}`;
      if (response.ok) return;
    } catch (error) {
      lastStatus = error instanceof Error ? error.message : String(error);
    }
    await new Promise((done) => setTimeout(done, 250));
  }
  throw new Error(`${label} did not become healthy: ${lastStatus}`);
}

function writeLines(label, chunk) {
  for (const rawLine of String(chunk).split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (line) process.stdout.write(`[${label}] ${line}\n`);
  }
}

async function shutdown(code) {
  if (stopping) return;
  stopping = true;
  for (const child of children) stopProcess(child);
  await Promise.all([...children].map((child) => waitForExit(child, 3_000)));
  process.exit(code);
}

function stopProcess(child) {
  if (!child.pid || child.exitCode !== null) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    return;
  }
  child.kill("SIGTERM");
}

function waitForExit(child, timeout) {
  return new Promise((done) => {
    if (child.exitCode !== null) return done();
    const timer = setTimeout(done, timeout);
    child.once("exit", () => { clearTimeout(timer); done(); });
  });
}

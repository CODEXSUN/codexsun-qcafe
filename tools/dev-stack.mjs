#!/usr/bin/env node

import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { watch } from "node:fs";
import { relative, resolve } from "node:path";
import { loadDotEnv, runPreflight } from "./preflight.mjs";

const ROOT = resolve(import.meta.dirname, "..");
const qCafeOnly = process.env.QCAFE_ONLY === "true";
const cafeServices = [
  { args: ["apps/q-cafe/api/src/server.mjs"], bin: null, healthUrl: "http://127.0.0.1:4180/health", label: "q-cafe-api" },
  { args: ["apps/q-cafe/web", "--config", "apps/q-cafe/web/vite.config.ts"], bin: resolve(ROOT, "node_modules/vite/bin/vite.js"), healthUrl: "http://127.0.0.1:5180", label: "q-cafe-web" },
];
const services = qCafeOnly ? cafeServices : [
  {
    args: ["watch", "apps/platform/core/api/src/server.ts"],
    bin: resolve(ROOT, "node_modules", "tsx", "dist", "cli.mjs"),
    healthUrl: "http://127.0.0.1:4100/health",
    label: "api",
  },
  {
    args: ["apps/platform/core/web", "--config", "apps/platform/core/web/vite.config.ts"],
    bin: resolve(ROOT, "node_modules", "vite", "bin", "vite.js"),
    healthUrl: "http://127.0.0.1:5173/",
    label: "web",
  },
  {
    args: ["apps/devkit/web", "--config", "apps/devkit/web/vite.config.ts"],
    bin: resolve(ROOT, "node_modules", "vite", "bin", "vite.js"),
    healthUrl: "http://127.0.0.1:5174/",
    label: "devkit",
  },
  {
    args: ["packages/chat/api/src/server.ts"],
    bin: resolve(ROOT, "node_modules", "tsx", "dist", "cli.mjs"),
    healthUrl: "http://127.0.0.1:4165/health",
    label: "chat-api",
  },
  {
    args: ["packages/chat/web", "--config", "packages/chat/web/vite.config.ts"],
    bin: resolve(ROOT, "node_modules", "vite", "bin", "vite.js"),
    healthUrl: "http://127.0.0.1:5176/",
    label: "chat",
  },
  {
    args: ["packages/zetro/api/src/server.ts"],
    bin: resolve(ROOT, "node_modules", "tsx", "dist", "cli.mjs"),
    healthUrl: "http://127.0.0.1:4150/health",
    label: "zetro-api",
  },
  {
    args: ["packages/zetro/web", "--config", "packages/zetro/web/vite.config.ts"],
    bin: resolve(ROOT, "node_modules", "vite", "bin", "vite.js"),
    healthUrl: "http://127.0.0.1:5175/",
    label: "zetro-web",
  },
];
const children = new Set();
const runningServices = new Map();
const restartingServices = new Set();
const restartAttempts = new Map();
const REFACTOR_RESTART_DELAY_MS = 800;
let stopping = false;
let releaseDevelopmentLock = async () => {};

for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => void shutdown(0));

try {
  const initialEnvironment = { ...loadDotEnv(), ...process.env };
  const lockPath = qCafeOnly
    ? resolve(ROOT, "apps/q-cafe/.local/dev-stack.lock")
    : resolve(ROOT, ".local/dev-stack.lock");
  releaseDevelopmentLock = await acquireDevelopmentLock(lockPath, initialEnvironment.OS_DEV_PORT_POLICY);
  const { env } = await runPreflight({
    host: qCafeOnly ? "0.0.0.0" : "127.0.0.1",
    ports: qCafeOnly ? [4180, 5180] : [4100, 4150, 4160, 4165, 5173, 5174, 5175, 5176],
  });
  if (!qCafeOnly && env.CODEXSUN_LOCAL_DEMO === "true") {
    const result = spawnSync("docker", ["compose", "-f", resolve(ROOT, "tools/local-demo/compose.json"), "up", "-d", "--wait"], { cwd: ROOT, stdio: "inherit", windowsHide: true });
    if (result.status !== 0) throw new Error("Local demonstration containers could not start.");
    env.ZETRO_AGENTS_FILE = resolve(ROOT, "tools/local-demo/agents.json");
    env.ZETRO_LOCAL_TOKEN = "local-demo-only";
    env.VITE_CHAT_LOCAL_DEMO = "true";
    console.log("Local simulation enabled. No production model or real contacts are connected.");
  }
  if (!qCafeOnly && env.CODEXSUN_ZETRO_DOCKER === "true") {
    env.ZETRO_TOOLS_TOKEN ||= randomBytes(32).toString("hex");
    const runner = startService({ args: ["packages/zetro/local-runner/src/server.mjs"], bin: null, label: "zetro-local-runner" }, env);
    await waitForHealthyUrl("http://127.0.0.1:4160/health", "zetro-local-runner", runner);
    const result = spawnSync("docker", ["compose", "-f", resolve(ROOT, "packages/zetro/docker/compose.json"), "up", "-d", "--wait"], { cwd: ROOT, env, stdio: "inherit", windowsHide: true });
    if (result.status !== 0) throw new Error("Zetro container could not start. Build zetro:v1 first.");
    env.ZETRO_AGENTS_FILE = resolve(ROOT, "packages/zetro/docker/agents.json");
    env.ZETRO_LOCAL_TOKEN ||= "local-demo-only";
    console.log("Zetro Codex container connected. Device sign-in is required for model responses.");
  }
  if (!qCafeOnly && env.CODEXSUN_ZXA_DOCKER === "true") {
    const result = spawnSync("docker", ["compose", "-f", resolve(ROOT, "packages/zxa/docker/compose.json"), "up", "-d", "--wait"], { cwd: ROOT, env, stdio: "inherit", windowsHide: true });
    if (result.status !== 0) throw new Error("ZXA container could not start. Build zxa:v1 first.");
    env.ZETRO_AGENTS_FILE = resolve(ROOT, "packages/zxa/docker/agents.json");
    env.ZXA_LOCAL_TOKEN ||= "local-zxa-only";
    console.log("ZXA multi-provider container connected. Configure at least one provider connection.");
  }
  console.log("CODEXSUN OS development runtime");
  for (const service of services) {
    const child = startService(service, env);
    await waitForHealthyUrl(service.healthUrl, service.label, child);
    console.log(`  ok ${service.label} is ready`);
  }
  if (env.CODEXSUN_VITE_HOT_RELOAD === "true") watchPlatformRefactors();
  else console.log("  - Vite hot reload and refactor restarts are disabled.");
  console.log("\n  ok Selected applications are ready");
  if (qCafeOnly) console.log("  - Q Cafe: http://127.0.0.1:5180 (API: 4180)");
  else console.log("  - Web: http://127.0.0.1:5173");
  console.log("  - API: http://127.0.0.1:4100\n");
  console.log("  - DevKit: http://127.0.0.1:5174\n");
  console.log("  - Chat: http://127.0.0.1:5176\n");
  console.log("  - Chat API: http://127.0.0.1:4165\n");
  console.log("  - Zetro API: http://127.0.0.1:4150");
  console.log("  - Zetro Web: http://127.0.0.1:5175\n");
} catch (error) {
  console.error(`  x ${error instanceof Error ? error.message : String(error)}`);
  await shutdown(1);
}

function startService(service, env) {
  const child = spawn(process.execPath, [...(service.bin ? [service.bin] : []), ...service.args], {
    cwd: ROOT,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  children.add(child);
  runningServices.set(service.label, { child, env, service });
  child.stdout.on("data", (chunk) => writeLines(service.label, chunk));
  child.stderr.on("data", (chunk) => writeLines(service.label, chunk));
  child.once("exit", (code) => {
    children.delete(child);
    if (runningServices.get(service.label)?.child === child) runningServices.delete(service.label);
    if (!stopping && !restartingServices.has(service.label)) void recoverService(service, env, code);
  });
  return child;
}

async function recoverService(service, env, code) {
  const attempt = (restartAttempts.get(service.label) ?? 0) + 1;
  restartAttempts.set(service.label, attempt);
  const delay = Math.min(30_000, 1_000 * 2 ** Math.min(attempt - 1, 5));
  console.error(`  ! ${service.label} exited (${code ?? "signal"}); retrying in ${Math.round(delay / 1_000)}s. Other services stay online.`);
  await new Promise((done) => setTimeout(done, delay));
  if (stopping || runningServices.has(service.label)) return;
  try {
    const child = startService(service, env);
    await waitForHealthyUrl(service.healthUrl, service.label, child);
    restartAttempts.delete(service.label);
    console.log(`  ok ${service.label} recovered`);
  } catch (error) {
    console.error(`  x ${service.label} recovery attempt failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function watchPlatformRefactors() {
  const targets = [
    resolve(ROOT, "apps/platform/core/api"),
    resolve(ROOT, "apps/platform/core/web"),
    resolve(ROOT, "packages/ui"),
    resolve(ROOT, "packages/ui/desk"),
  ];
  const scheduled = new Set();
  let timer;

  for (const target of targets) {
    watch(target, { recursive: true }, (_event, fileName) => {
      if (!fileName || !requiresProcessRestart(fileName)) return;
      for (const label of affectedServices(target, fileName)) scheduled.add(label);
      clearTimeout(timer);
      timer = setTimeout(() => {
        for (const label of scheduled) void restartService(label);
        scheduled.clear();
      }, REFACTOR_RESTART_DELAY_MS);
    });
  }
  console.log(`  - Platform source changes use hot reload after edits settle. Refactor changes restart once after ${REFACTOR_RESTART_DELAY_MS}ms.`);
}

function requiresProcessRestart(fileName) {
  const name = String(fileName).replace(/\\/gu, "/");
  return name === "package.json"
    || name === "package-lock.json"
    || /(^|\/)tsconfig(?:\.[^/]+)?\.json$/u.test(name)
    || /(^|\/)vite\.config\.[^/]+$/u.test(name)
    || /(^|\/)tsup\.config\.[^/]+$/u.test(name);
}

function affectedServices(target, fileName) {
  const path = relative(ROOT, resolve(target, fileName)).replace(/\\/gu, "/");
  if (path.startsWith("apps/platform/core/api/")) return ["api"];
  return ["web"];
}

async function restartService(label) {
  const running = runningServices.get(label);
  if (!running || stopping || restartingServices.has(label)) return;

  restartingServices.add(label);
  console.log(`  ! Restarting ${label} after a platform refactor`);
  try {
    stopProcess(running.child);
    await waitForExit(running.child, 3_000);
    if (stopping) return;
    startService(running.service, running.env);
    await waitForHealthyUrl(running.service.healthUrl, running.service.label);
    console.log(`  ok ${label} restarted`);
  } catch (error) {
    console.error(`  x ${label} restart failed: ${error instanceof Error ? error.message : String(error)}`);
    void recoverService(running.service, running.env, 1);
  } finally {
    restartingServices.delete(label);
  }
}

async function waitForHealthyUrl(url, label, child) {
  const startedAt = Date.now();
  let lastStatus = "not reachable";
  while (Date.now() - startedAt < 30_000) {
    if (child?.exitCode !== null) throw new Error(`${label} exited before it became ready.`);
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2_000) });
      lastStatus = `HTTP ${response.status}`;
      if (response.ok) {
        await new Promise((done) => setTimeout(done, 100));
        if (child?.exitCode !== null) throw new Error(`${label} exited while claiming its port.`);
        return;
      }
    } catch (error) {
      lastStatus = error instanceof Error ? error.message : String(error);
    }
    await new Promise((done) => setTimeout(done, 250));
  }
  throw new Error(`${label} did not become healthy: ${lastStatus}`);
}

async function acquireDevelopmentLock(path, portPolicy = "replace") {
  await mkdir(resolve(path, ".."), { recursive: true });
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      await mkdir(path, { recursive: false });
      await writeFile(resolve(path, "owner.json"), JSON.stringify({ pid: process.pid, root: ROOT }), "utf8");
      let released = false;
      return async () => {
        if (released) return;
        released = true;
        const owner = await readLockOwner(path);
        if (owner?.pid === process.pid) await rm(path, { recursive: true, force: true });
      };
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      await new Promise((done) => setTimeout(done, 100));
      const owner = await readLockOwner(path);
      if (owner?.pid === process.pid) throw new Error("The development stack already owns its runtime lock.");
      if (owner?.pid && processIsRunning(owner.pid)) {
        if (portPolicy === "abort") {
          throw new Error(`Another development stack is running as PID ${owner.pid}.`);
        }
        console.log(`  ! Replacing development stack supervisor PID ${owner.pid}`);
        stopProcessId(owner.pid);
        await waitForProcessExit(owner.pid, 5_000);
        if (processIsRunning(owner.pid)) throw new Error(`Development stack PID ${owner.pid} did not stop.`);
      }
      await rm(path, { recursive: true, force: true });
    }
  }
  throw new Error("The development stack runtime lock could not be acquired.");
}

async function readLockOwner(path) {
  try {
    return JSON.parse(await readFile(resolve(path, "owner.json"), "utf8"));
  } catch {
    return null;
  }
}

function processIsRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function stopProcessId(pid) {
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" });
    return;
  }
  try {
    process.kill(pid, "SIGTERM");
  } catch (error) {
    if (error?.code !== "ESRCH") throw error;
  }
}

async function waitForProcessExit(pid, timeout) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeout) {
    if (!processIsRunning(pid)) return;
    await new Promise((done) => setTimeout(done, 100));
  }
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
  await releaseDevelopmentLock();
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

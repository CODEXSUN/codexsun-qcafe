#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createConnection, createServer } from "node:net";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = resolve(import.meta.dirname, "..");

export async function runPreflight(options = {}) {
  const env = { ...loadDotEnv(), ...process.env };
  const ports = options.ports ?? [
    readPort(env.OS_API_PORT, 4100, "OS_API_PORT"),
    readPort(env.OS_WEB_PORT, 5173, "OS_WEB_PORT"),
  ];

  console.log("\nCODEXSUN OS development preflight");
  for (const port of ports) await freePort(port, "127.0.0.1", env.OS_DEV_PORT_POLICY);
  await checkDatabase(env);
  console.log("  ok Preflight complete\n");
  return { env, ports };
}

export function loadDotEnv() {
  const file = resolve(ROOT, ".env");
  if (!existsSync(file)) return {};
  return Object.fromEntries(
    readFileSync(file, "utf8")
      .split(/\r?\n/u)
      .map((line) => line.match(/^\s*([^#=]+?)\s*=\s*(.*?)\s*$/u))
      .filter(Boolean)
      .map((match) => [match[1].trim(), parseEnvValue(match[2])]),
  );
}

async function freePort(port, host, policy = "replace") {
  console.log(`  - Checking ${host}:${port}`);
  if (await portIsFree(port, host)) {
    console.log(`  ok Port ${port} is free`);
    return;
  }

  const pids = getPidsOnPort(port);
  if (policy === "abort" || pids.length === 0) {
    throw new Error(`Port ${port} is occupied${pids.length ? ` by PID ${pids.join(", ")}` : ""}.`);
  }

  console.log(`  ! Port ${port} is occupied by PID ${pids.join(", ")}`);
  for (const pid of pids) stopProcessTree(pid);
  await waitUntilPortIsFree(port, host);
  console.log(`  ok Released port ${port}`);
}

async function checkDatabase(env) {
  const required = String(env.OS_DATABASE_REQUIRED).toLowerCase() === "true";
  if (!env.DATABASE_URL) {
    if (required) throw new Error("DATABASE_URL is required but missing.");
    console.log("  - Database check skipped because DATABASE_URL is not configured");
    return;
  }

  const target = new URL(env.DATABASE_URL);
  const port = Number(target.port || defaultDatabasePort(target.protocol));
  console.log(`  - Checking database ${target.hostname}:${port}`);
  try {
    await connectToPort(target.hostname, port);
    console.log("  ok Database endpoint is reachable");
  } catch (error) {
    if (required) throw error;
    console.log("  ! Database endpoint is unavailable; current runtime does not require it");
  }
}

function getPidsOnPort(port) {
  try {
    if (process.platform === "win32") {
      const output = execFileSync("netstat", ["-ano", "-p", "tcp"], { encoding: "utf8" });
      return [...new Set(output.split(/\r?\n/u)
        .map((line) => line.trim().split(/\s+/u))
        .filter((parts) => parts[3] === "LISTENING" && addressPort(parts[1]) === port)
        .map((parts) => Number(parts[4]))
        .filter((pid) => pid > 0 && pid !== process.pid))];
    }
    const output = execFileSync("lsof", ["-ti", `:${port}`], { encoding: "utf8" });
    return [...new Set(output.split(/\s+/u).map(Number).filter((pid) => pid > 0 && pid !== process.pid))];
  } catch {
    return [];
  }
}

function stopProcessTree(pid) {
  if (process.platform === "win32") {
    try {
      execFileSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" });
    } catch {
      // The listener may exit after discovery. The port check verifies the result.
    }
    return;
  }
  try {
    process.kill(pid, "SIGTERM");
  } catch (error) {
    if (error?.code !== "ESRCH") throw error;
  }
}

function portIsFree(port, host) {
  return new Promise((done) => {
    const server = createServer();
    server.once("error", () => done(false));
    server.once("listening", () => server.close(() => done(true)));
    server.listen(port, host);
  });
}

async function waitUntilPortIsFree(port, host) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (await portIsFree(port, host)) return;
    await new Promise((done) => setTimeout(done, 250));
  }
  throw new Error(`Port ${port} was not released.`);
}

function connectToPort(host, port) {
  return new Promise((done, fail) => {
    const socket = createConnection({ host, port });
    const timer = setTimeout(() => socket.destroy(new Error("Database connection timed out.")), 2_000);
    socket.once("connect", () => { clearTimeout(timer); socket.end(); done(); });
    socket.once("error", (error) => { clearTimeout(timer); fail(error); });
  });
}

function readPort(value, fallback, name) {
  const port = Number(value || fallback);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error(`${name} is invalid.`);
  return port;
}

function parseEnvValue(value) {
  const trimmed = String(value ?? "").trim();
  const quote = trimmed[0];
  if ((quote === "\"" || quote === "'") && trimmed.endsWith(quote)) return trimmed.slice(1, -1);
  return trimmed.replace(/\s+#.*$/u, "").trim();
}

function defaultDatabasePort(protocol) {
  if (protocol === "postgres:" || protocol === "postgresql:") return 5432;
  if (protocol === "mysql:" || protocol === "mariadb:") return 3306;
  throw new Error(`Unsupported database protocol: ${protocol}`);
}

function addressPort(address) {
  return Number(String(address).match(/:(\d+)$/u)?.[1]);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runPreflight().catch((error) => { console.error(`  x ${error.message}\n`); process.exit(1); });
}

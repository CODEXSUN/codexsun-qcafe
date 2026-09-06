#!/usr/bin/env node

import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createRunnerHttp } from "./http.mjs";
import { WorkspaceToolProvider } from "./workspace-tools.mjs";

const defaultRoot = process.env.ZETRO_WORKSPACE_ROOT || process.env.ZETRO_PROJECTS_ROOT || process.cwd();
const stateFile = process.env.CODEXSUN_ZETRO_DESK_STATE || resolve(process.env.APPDATA || process.cwd(), "CODEXSUN", "zetro-desk-bridge.json");
const state = await loadState(stateFile, defaultRoot);
if (process.argv.includes("--docker")) await startDocker(state);
const workspace = await WorkspaceToolProvider.create(state.repositoryRoot);
const tools = createRunnerHttp({ workspace, token: state.toolsToken, audit: (event) => console.log(JSON.stringify({ service: "zetro-desk-tools", ...event })) });
tools.requestTimeout = 10_000;
tools.headersTimeout = 10_000;
tools.listen(4160, "127.0.0.1", () => console.log("Zetro Desk read-only tools ready on 127.0.0.1:4160"));

const bridge = createServer((request, response) => void handle(request, response));
bridge.requestTimeout = 130_000;
bridge.headersTimeout = 10_000;
bridge.listen(4161, "127.0.0.1", () => console.log("Zetro Desk bridge ready on 127.0.0.1:4161"));
for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => { tools.close(); bridge.close(); });

async function handle(request, response) {
  if (request.url === "/health" && request.method === "GET") return send(response, 200, await health());
  if (!authorized(request)) return send(response, 401, { error: "Desktop bridge authentication required." });
  if (request.url === "/api/v1/desktop/zetro/settings" && request.method === "GET") return send(response, 200, settings());
  if (request.url === "/api/v1/desktop/zetro/settings" && request.method === "PUT") return saveSettings(request, response);
  if (request.url === "/api/v1/desktop/zetro/agents" && request.method === "GET") return send(response, 200, [await agent()]);
  if (request.url === "/api/v1/desktop/zetro/messages" && request.method === "POST") return forwardPrompt(request, response);
  return send(response, 404, { error: "Not found." });
}

function settings() {
  return { repositoryRoot: state.repositoryRoot, githubUrl: state.githubUrl, enabledAgentIds: ["zxa"], defaultAgentId: "zxa" };
}

async function saveSettings(request, response) {
  const input = await body(request);
  if (!input || typeof input.repositoryRoot !== "string" || typeof input.githubUrl !== "string") return send(response, 400, { error: "Provide a local repository folder and GitHub URL." });
  try {
    state.repositoryRoot = await workspace.setRoot(input.repositoryRoot);
    state.githubUrl = input.githubUrl.trim();
    await saveState(stateFile, state);
    return send(response, 200, settings());
  } catch {
    return send(response, 400, { error: "Choose an existing local repository folder." });
  }
}

async function forwardPrompt(request, response) {
  const input = await body(request);
  if (!input || input.agentId !== "zxa" || typeof input.message !== "string" || !input.message.trim()) return send(response, 400, { error: "Select ZXA and provide a prompt." });
  try {
    const upstream = await fetch(`${state.agentUrl}/api/v1/zxa/messages`, {
      method: "POST", headers: { authorization: `Bearer ${state.agentToken}`, "content-type": "application/json" },
      body: JSON.stringify({ conversationId: input.conversationId, message: input.message, attachments: input.attachments }), signal: AbortSignal.timeout(125_000),
    });
    const text = await upstream.text();
    response.writeHead(upstream.status, { "Content-Type": upstream.headers.get("content-type") || "application/json" });
    response.end(text);
  } catch {
    send(response, 503, { error: "Zetro Desk cannot reach the local ZXA Docker agent. Run npm.cmd run zetro:desk." });
  }
}

async function health() {
  try {
    const response = await fetch(`${state.agentUrl}/health`, { signal: AbortSignal.timeout(2_000) });
    return { status: response.ok ? "ok" : "degraded", service: "zetro-desk-bridge", repositoryRoot: state.repositoryRoot, agent: response.ok ? "ready" : "offline" };
  } catch {
    return { status: "degraded", service: "zetro-desk-bridge", repositoryRoot: state.repositoryRoot, agent: "offline" };
  }
}

async function agent() {
  const status = await health();
  return { id: "zxa", name: "ZXA", duty: "Local Docker assistant with approved read-only repository tools.", skills: [], configured: status.agent === "ready", runtimeStatus: status.agent === "ready" ? "healthy" : "offline", mode: "provider" };
}

function authorized(request) {
  const actual = Buffer.from(request.headers["x-zetro-desk-key"] || "");
  const expected = Buffer.from(state.bridgeToken);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

async function body(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 3_000_000) return null;
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { return null; }
}

function send(response, status, value) {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(value));
}

async function loadState(path, root) {
  try {
    const saved = JSON.parse(await readFile(path, "utf8"));
    if (validState(saved)) return saved;
  } catch { /* First local launch creates the private state file. */ }
  const state = { repositoryRoot: root, githubUrl: "", agentUrl: process.env.ZETRO_DESK_AGENT_URL || "http://127.0.0.1:4230", agentToken: process.env.ZXA_LOCAL_TOKEN || "local-zxa-only", toolsToken: process.env.ZETRO_TOOLS_TOKEN || randomBytes(32).toString("hex"), bridgeToken: randomBytes(32).toString("hex") };
  await saveState(path, state);
  return state;
}

function validState(value) {
  return value && typeof value.repositoryRoot === "string" && typeof value.githubUrl === "string" && typeof value.agentUrl === "string" && typeof value.agentToken === "string" && typeof value.toolsToken === "string" && typeof value.bridgeToken === "string";
}

function startDocker(state) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn("docker", ["compose", "-f", "packages/zxa/docker/compose.json", "up", "-d", "--wait", "--force-recreate", "--build"], {
      cwd: resolve(import.meta.dirname, "../../../.."),
      env: { ...process.env, ZXA_LOCAL_TOKEN: state.agentToken, ZETRO_TOOLS_TOKEN: state.toolsToken },
      stdio: "inherit",
      windowsHide: true,
    });
    child.once("error", () => reject(new Error("Docker Desktop is required to start the local Zetro agent.")));
    child.once("exit", (code) => code === 0 ? resolvePromise() : reject(new Error("The local ZXA Docker agent did not start.")));
  });
}

async function saveState(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(value, null, 2), "utf8");
}

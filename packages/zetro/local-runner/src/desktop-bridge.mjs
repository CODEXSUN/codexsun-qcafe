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
const coordinator = await ensureZetroApi(state);

const bridge = createServer((request, response) => void handle(request, response));
bridge.requestTimeout = 130_000;
bridge.headersTimeout = 10_000;
bridge.listen(4161, "127.0.0.1", () => console.log("Zetro Desk bridge ready on 127.0.0.1:4161"));
for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => shutdown(signal));
watchDesktopParent();

async function handle(request, response) {
  if (request.url === "/health" && request.method === "GET") return send(response, 200, await health());
  if (!authorized(request)) return send(response, 401, { error: "Desktop bridge authentication required." });
  if (request.url === "/api/v1/desktop/zetro/settings" && request.method === "GET") return send(response, 200, settings());
  if (request.url === "/api/v1/desktop/zetro/settings" && request.method === "PUT") return saveSettings(request, response);
  if (request.url === "/api/v1/desktop/zetro/agents" && request.method === "GET") return send(response, 200, [await agent()]);
  if (request.url === "/api/v1/desktop/zetro/messages" && request.method === "POST") return forwardPrompt(request, response);
  if (request.url === "/api/v1/desktop/zetro/coordinator" && request.method === "POST") return forwardCoordinator(request, response);
  return send(response, 404, { error: "Not found." });
}

function settings() {
  return { repositoryRoot: state.repositoryRoot, githubUrl: state.githubUrl, enabledAgentIds: state.enabledAgentIds, defaultAgentId: state.defaultAgentId };
}

async function saveSettings(request, response) {
  const input = await body(request);
  if (!input || typeof input.repositoryRoot !== "string" || typeof input.githubUrl !== "string") return send(response, 400, { error: "Provide a local repository folder and GitHub URL." });
  try {
    state.repositoryRoot = await workspace.setRoot(input.repositoryRoot);
    state.githubUrl = input.githubUrl.trim();
    state.enabledAgentIds = Array.isArray(input.enabledAgentIds) && input.enabledAgentIds.length ? input.enabledAgentIds : ["zxa"];
    state.defaultAgentId = state.enabledAgentIds.includes(input.defaultAgentId) ? input.defaultAgentId : state.enabledAgentIds[0];
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
    const upstream = await fetch(`${state.zetroApiUrl}/api/v1/zetro/messages`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        agentId: "zxa",
        conversationId: input.conversationId,
        message: input.message,
        attachments: input.attachments,
        provider: input.provider,
        model: input.model
      }),
      signal: AbortSignal.timeout(125_000),
    });
    const text = await upstream.text();
    response.writeHead(upstream.status, { "Content-Type": upstream.headers.get("content-type") || "application/json" });
    response.end(text);
  } catch {
    send(response, 503, { error: "Zetro Desk cannot reach the local ZXA Docker agent. Run npm.cmd run zetro:desk." });
  }
}

async function forwardCoordinator(request, response) {
  const input = await body(request);
  if (!input || !["GET", "POST", "PUT", "DELETE"].includes(input.method) || !allowedCoordinatorPath(input.path, input.method)) return send(response, 400, { error: "Unsupported Zetro coordinator operation." });
  try {
    const upstream = await fetch(`${state.zetroApiUrl}${input.path}`, {
      method: input.method,
      headers: input.body === undefined ? undefined : { "content-type": "application/json" },
      body: input.body === undefined ? undefined : JSON.stringify(input.body),
      signal: AbortSignal.timeout(125_000),
    });
    const text = await upstream.text();
    response.writeHead(upstream.status, { "Content-Type": upstream.headers.get("content-type") || "application/json" });
    response.end(text);
  } catch {
    send(response, 503, { error: "The local Zetro coordinator is unavailable." });
  }
}

function allowedCoordinatorPath(rawPath, method) {
  if (typeof rawPath !== "string" || rawPath.includes("..")) return false;
  const path = rawPath.split("?")[0];
  if (method === "GET" && (path === "/api/v1/zetro/workspace" || path === "/api/v1/zetro/workspace/folders" || path === "/api/v1/zetro/providers" || path === "/api/v1/zetro/models")) return true;
  if (method === "POST" && (path === "/api/v1/zetro/workspace/folders" || /^\/api\/v1\/zetro\/workspace\/projects\/[^/]+\/archive-chats$/u.test(path))) return true;
  if (method === "PUT" && (/^\/api\/v1\/zetro\/workspace\/projects\/[^/]+$/u.test(path) || /^\/api\/v1\/zetro\/workspace\/conversations\/[^/]+$/u.test(path) || /^\/api\/v1\/zetro\/providers\/[a-z]$/u.test(path))) return true;
  if (method === "DELETE" && (/^\/api\/v1\/zetro\/workspace\/projects\/[^/]+$/u.test(path) || /^\/api\/v1\/zetro\/workspace\/conversations\/[^/]+$/u.test(path))) return true;
  if (method === "GET" && (/^\/api\/v1\/ai-tasks(?:\/[0-9a-f-]{36})?$/u.test(path) || path === "/api/v1/zetro/runs" || path === "/api/v1/zetro/knowledge/proposals")) return true;
  if (method === "POST" && (path === "/api/v1/ai-tasks" || /^\/api\/v1\/ai-tasks\/[0-9a-f-]{36}\/(?:start|approve|release)$/u.test(path) || path === "/api/v1/zetro/runs" || /^\/api\/v1\/zetro\/runs\/[0-9a-f-]{36}\/(?:approval|resume|cancel)$/u.test(path))) return true;
  return method === "PUT" && /^\/api\/v1\/zetro\/knowledge\/proposals\/[0-9a-f-]{36}\/review$/u.test(path);
}

async function health() {
  try {
    const [agentResponse, coordinatorResponse] = await Promise.all([fetch(`${state.agentUrl}/health`, { signal: AbortSignal.timeout(2_000) }), fetch(`${state.zetroApiUrl}/health`, { signal: AbortSignal.timeout(2_000) })]);
    const ready = agentResponse.ok && coordinatorResponse.ok;
    return { status: ready ? "ok" : "degraded", service: "zetro-desk-bridge", repositoryRoot: state.repositoryRoot, agent: ready ? "ready" : "offline", coordinator: coordinatorResponse.ok ? "ready" : "offline" };
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
  let saved;
  try {
    saved = JSON.parse(await readFile(path, "utf8"));
    if (validState(saved)) return normalizeState(saved);
  } catch { /* First local launch creates the private state file. */ }
  const state = normalizeState({
    repositoryRoot: typeof saved?.repositoryRoot === "string" ? saved.repositoryRoot : root,
    githubUrl: typeof saved?.githubUrl === "string" ? saved.githubUrl : "",
    enabledAgentIds: saved?.enabledAgentIds,
    defaultAgentId: saved?.defaultAgentId,
    zetroApiUrl: process.env.ZETRO_DESK_API_URL || "http://127.0.0.1:4151",
    agentUrl: process.env.ZETRO_DESK_AGENT_URL || "http://127.0.0.1:4230",
    agentToken: process.env.ZXA_LOCAL_TOKEN || "local-zxa-only",
    toolsToken: process.env.ZETRO_TOOLS_TOKEN || randomBytes(32).toString("hex"),
    bridgeToken: randomBytes(32).toString("hex"),
  });
  await saveState(path, state);
  return state;
}

function normalizeState(value) {
  const enabledAgentIds = Array.isArray(value.enabledAgentIds) && value.enabledAgentIds.length ? value.enabledAgentIds : ["zxa"];
  return { ...value, enabledAgentIds, defaultAgentId: enabledAgentIds.includes(value.defaultAgentId) ? value.defaultAgentId : enabledAgentIds[0], zetroApiUrl: value.zetroApiUrl || process.env.ZETRO_DESK_API_URL || "http://127.0.0.1:4151" };
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

async function ensureZetroApi(state) {
  if (await endpointReady(`${state.zetroApiUrl}/health`)) return null;
  const root = resolve(import.meta.dirname, "../../../..");
  const localState = resolve(dirname(stateFile), "zetro-state");
  await mkdir(localState, { recursive: true });
  const child = spawn(process.execPath, [resolve(root, "node_modules/tsx/dist/cli.mjs"), "packages/zetro/api/src/server.ts"], {
    cwd: root,
    env: {
      ...process.env,
      OS_IDENTITY_URL: "",
      ZETRO_AGENTS_FILE: resolve(root, "packages/zxa/docker/zetro-agent.json"),
      ZXA_LOCAL_TOKEN: state.agentToken,
      ZETRO_PROJECTS_ROOT: state.repositoryRoot,
      ZETRO_API_HOST: "127.0.0.1",
      ZETRO_API_PORT: new URL(state.zetroApiUrl).port || "4151",
      ZETRO_DATABASE_FILE: resolve(localState, "zetro.db"),
      ZETRO_KNOWLEDGE_DATABASE_FILE: resolve(localState, "knowledge.db"),
      ZETRO_WORKSPACE_DATABASE_FILE: resolve(localState, "workspace.db"),
      AI_TASK_DATABASE_FILE: resolve(localState, "ai-tasks.db"),
    },
    stdio: "inherit",
    windowsHide: true,
  });
  child.once("error", () => console.error("Unable to start the local Zetro coordinator."));
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (await endpointReady(`${state.zetroApiUrl}/health`)) return child;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
  }
  child.kill();
  throw new Error("The local Zetro coordinator did not become ready on its configured port.");
}

async function endpointReady(url) {
  try { return (await fetch(url, { signal: AbortSignal.timeout(500) })).ok; }
  catch { return false; }
}

function watchDesktopParent() {
  const parentPid = Number.parseInt(process.env.CODEXSUN_DESKTOP_PARENT_PID || "", 10);
  if (!Number.isInteger(parentPid) || parentPid <= 0) return;
  const timer = setInterval(() => {
    try { process.kill(parentPid, 0); }
    catch { clearInterval(timer); shutdown("SIGTERM"); }
  }, 2_000);
  timer.unref();
}

function shutdown(signal) {
  tools.close();
  bridge.close();
  coordinator?.kill(signal);
}

async function saveState(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(value, null, 2), "utf8");
}

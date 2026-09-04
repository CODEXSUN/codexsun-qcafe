import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, symlink, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";

const runtimeRoot = "/runtime";
const stateRoot = "/state/agents";
const command = process.argv[2] ?? "check";

if (command === "check") await check();
else if (command === "apply-cli") await applyCli();
else if (command === "stage-agent-files") await stageAgentFiles(process.argv[3], process.argv[4]);
else if (command === "activate-agent-files") await activateAgentFiles(process.argv[3], process.argv[4]);
else fail("Use check, apply-cli, stage-agent-files <url> <sha256>, or activate-agent-files <sha256> --reviewed.");

async function check() {
  const installed = await readJson(join(runtimeRoot, "current", "package.json"));
  const status = await readJson(join(runtimeRoot, "update-status.json"));
  const effective = installed?.dependencies ?? bundledVersions();
  const entries = await Promise.all(Object.keys(bundledVersions()).map(async (name) => [name, await latestVersion(name)]));
  const available = Object.fromEntries(entries);
  output({
    installed: effective,
    bundled: bundledVersions(),
    available,
    updatesAvailable: Object.keys(effective).filter((name) => available[name] && available[name] !== effective[name]),
    activeAgentFiles: await readJson(join(stateRoot, "active.json")),
    lastUpdate: status,
  });
}

async function applyCli() {
  const release = `${new Date().toISOString().replaceAll(/[:.]/gu, "-")}-${randomUUID().slice(0, 8)}`;
  const releasePath = join(runtimeRoot, "releases", release);
  await mkdir(releasePath, { recursive: true });
  try {
    await run("npm", ["init", "-y"], releasePath);
    await run("npm", ["install", "--save-exact", "@openai/codex@latest", "@google/gemini-cli@latest", "opencode-ai@latest"], releasePath);
    const nextLink = join(runtimeRoot, `.current-${randomUUID()}`);
    await symlink(releasePath, nextLink, "dir");
    await rm(join(runtimeRoot, "current"), { force: true, recursive: true });
    await rename(nextLink, join(runtimeRoot, "current"));
    const manifest = await readJson(join(releasePath, "package.json"));
    const status = { status: "applied", target: "cli", release, appliedAt: new Date().toISOString(), versions: manifest.dependencies };
    await writeJson(join(runtimeRoot, "update-status.json"), status);
    output(status);
  } catch (error) {
    await rm(releasePath, { force: true, recursive: true });
    const status = { status: "failed", target: "cli", failedAt: new Date().toISOString(), error: error.message };
    await writeJson(join(runtimeRoot, "update-status.json"), status);
    fail(error.message);
  }
}

async function stageAgentFiles(url, expectedHash) {
  if (!url || !/^https?:\/\//u.test(url) || !/^[a-f\d]{64}$/iu.test(expectedHash ?? "")) fail("A HTTPS URL and SHA-256 checksum are required.");
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) fail(`Agent file download failed with HTTP ${response.status}.`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const actualHash = createHash("sha256").update(bytes).digest("hex");
  if (actualHash.toLowerCase() !== expectedHash.toLowerCase()) fail("Agent file checksum does not match.");
  const content = JSON.parse(bytes.toString("utf8"));
  validateAgents(content);
  const path = join(stateRoot, "candidates", `${actualHash}.json`);
  await writeJson(path, { revision: actualHash, stagedAt: new Date().toISOString(), source: url, agents: content.agents });
  output({ status: "staged", revision: actualHash, path, requiresReview: true });
}

async function activateAgentFiles(hash, reviewed) {
  if (!/^[a-f\d]{64}$/iu.test(hash ?? "") || reviewed !== "--reviewed") fail("Activation requires a valid revision and --reviewed.");
  const candidate = await readJson(join(stateRoot, "candidates", `${hash}.json`));
  if (!candidate) fail("The staged agent revision was not found.");
  await writeJson(join(stateRoot, "active.json"), { ...candidate, activatedAt: new Date().toISOString(), reviewConfirmed: true });
  output({ status: "activated", revision: hash });
}

function validateAgents(content) {
  if (!Array.isArray(content?.agents) || !content.agents.length) fail("Agent file must contain a non-empty agents array.");
  for (const agent of content.agents) {
    if (typeof agent?.id !== "string" || typeof agent?.name !== "string" || typeof agent?.duty !== "string" || !Array.isArray(agent?.skills)) fail("Each agent needs id, name, duty, and skills.");
  }
}

function run(executable, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { cwd, env: process.env, stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(stderr.trim() || `${executable} exited with ${code}.`)));
  });
}

async function latestVersion(name) {
  try { return JSON.parse(await runCapture("npm", ["view", name, "version", "--json"], runtimeRoot)); }
  catch { return null; }
}

function runCapture(executable, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { cwd, env: process.env, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = ""; let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve(stdout.trim()) : reject(new Error(stderr.trim() || `${executable} exited with ${code}.`)));
  });
}

function bundledVersions() {
  return { "@openai/codex": "0.153.2", "@google/gemini-cli": "0.58.0", "opencode-ai": "1.18.28" };
}

async function readJson(path) { try { return JSON.parse(await readFile(path, "utf8")); } catch { return null; } }
async function writeJson(path, value) { await mkdir(dirname(path), { recursive: true }); await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8"); }
function output(value) { process.stdout.write(`${JSON.stringify(value)}\n`); }
function fail(message) { process.stderr.write(`${message}\n`); process.exit(1); }

import type { FastifyInstance } from "fastify";
import { conversationSchema, createFolderSchema, projectSchema, settingsSchema } from "./workspace-contracts.js";
import type { AgentSummary } from "./contracts.js";
import type { WorkspaceStore } from "./workspace-store.js";
import { mkdir, readdir, realpath, stat } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";

export function registerWorkspaceRoutes(app: FastifyInstance, store: WorkspaceStore, agents: () => Promise<AgentSummary[]>) {
  app.addHook("onClose", async () => store.close());
  app.get("/api/v1/zetro/workspace", async () => store.snapshot());
  app.get("/api/v1/zetro/workspace/folders", async () => ({ root: await realpath(store.settings().repositoryRoot), folders: await listFolders(store.settings().repositoryRoot) }));
  app.post("/api/v1/zetro/workspace/folders", async (request, reply) => {
    const input = createFolderSchema.safeParse(request.body);
    if (!input.success) return reply.code(400).send({ error: "Enter a valid repository-relative folder path." });
    try {
      const folder = await createFolder(store.settings().repositoryRoot, input.data.folder);
      return reply.code(201).send({ folder, created: true });
    } catch (cause) {
      return reply.code(400).send({ error: cause instanceof Error ? cause.message : "The local folder could not be created." });
    }
  });
  app.get("/api/v1/zetro/settings", async () => {
    const settings = store.settings();
    const available = await agents();
    const registered = new Set(available.map((agent) => agent.id));
    const enabledAgentIds = settings.enabledAgentIds.filter((id) => registered.has(id));
    const fallback = available.find((agent) => agent.configured)?.id ?? available[0]?.id;
    if (!enabledAgentIds.length && fallback) enabledAgentIds.push(fallback);
    const defaultAgentId = enabledAgentIds.includes(settings.defaultAgentId) ? settings.defaultAgentId : enabledAgentIds[0] ?? settings.defaultAgentId;
    return { ...settings, enabledAgentIds, defaultAgentId };
  });
  app.put("/api/v1/zetro/settings", async (request, reply) => {
    const input = settingsSchema.safeParse(request.body);
    if (!input.success || !(await isDirectory(input.data.repositoryRoot))) return reply.code(400).send({ error: "Choose an existing local repository folder." });
    const registered = new Set((await agents()).map((agent) => agent.id));
    if (!registered.has(input.data.defaultAgentId) || input.data.enabledAgentIds.some((id) => !registered.has(id)) || !input.data.enabledAgentIds.includes(input.data.defaultAgentId)) return reply.code(400).send({ error: "Select a registered enabled default agent." });
    const settings = { ...input.data, repositoryRoot: await realpath(input.data.repositoryRoot), enabledAgentIds: [...new Set(input.data.enabledAgentIds)] };
    store.saveSettings(settings);
    return settings;
  });
  app.put<{ Params: { id: string } }>("/api/v1/zetro/workspace/conversations/:id", async (request, reply) => { const input = conversationSchema.safeParse(request.body); if (!input.success || input.data.id !== request.params.id) return reply.code(400).send({ error: "Provide a valid conversation." }); store.saveConversation(input.data); return input.data; });
  app.delete<{ Params: { id: string } }>("/api/v1/zetro/workspace/conversations/:id", async (request) => { store.deleteConversation(request.params.id); return { deleted: true }; });
  app.put<{ Params: { id: string } }>("/api/v1/zetro/workspace/projects/:id", async (request, reply) => { const input = projectSchema.safeParse(request.body); if (!input.success || input.data.id !== request.params.id) return reply.code(400).send({ error: "Provide a valid project." }); if (input.data.localFolder && !(await isAllowedFolder(store.settings().repositoryRoot, input.data.localFolder))) return reply.code(400).send({ error: "Select a folder inside the configured Zetro project root." }); store.saveProject(input.data); return input.data; });
  app.post<{ Params: { id: string } }>("/api/v1/zetro/workspace/projects/:id/archive-chats", async (request) => { store.archiveProjectChats(request.params.id); return store.snapshot(); });
  app.delete<{ Params: { id: string } }>("/api/v1/zetro/workspace/projects/:id", async (request) => { store.deleteProject(request.params.id); return store.snapshot(); });
}

async function isDirectory(path: string) { try { return (await stat(await realpath(path))).isDirectory(); } catch { return false; } }

async function listFolders(root: string) {
  const absoluteRoot = await realpath(root);
  const folders = ["."];
  await visit(absoluteRoot, "", 0);
  return folders;

  async function visit(parent: string, prefix: string, depth: number) {
    if (depth >= 4 || folders.length >= 500) return;
    const entries = await readdir(parent, { withFileTypes: true });
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      if (!entry.isDirectory() || entry.name.startsWith(".") || ["node_modules", "target", "dist"].includes(entry.name)) continue;
      const folder = prefix ? `${prefix}/${entry.name}` : entry.name;
      folders.push(folder);
      if (folders.length >= 500) return;
      await visit(resolve(parent, entry.name), folder, depth + 1);
    }
  }
}

async function createFolder(root: string, requestedFolder: string) {
  const folder = normalizeFolder(requestedFolder);
  if (folder === ".") return folder;
  const absoluteRoot = await realpath(root);
  let current = absoluteRoot;
  for (const segment of folder.split("/")) {
    current = resolve(current, segment);
    await mkdir(current, { recursive: false }).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "EEXIST") throw error;
    });
    const resolvedCurrent = await realpath(current);
    if (!isInside(absoluteRoot, resolvedCurrent)) throw new Error("Choose a folder inside the configured Zetro project root.");
    current = resolvedCurrent;
  }
  return relative(absoluteRoot, current).split(sep).join("/") || ".";
}

function normalizeFolder(folder: string) {
  const trimmed = folder.trim().replaceAll("\\", "/").replace(/^\/+|\/+$/gu, "");
  if (!trimmed || trimmed === ".") return ".";
  if (isAbsolute(folder) || trimmed.split("/").some((segment) => !segment || segment === "." || segment === ".." || /[<>:"|?*\u0000-\u001f]/u.test(segment))) {
    throw new Error("Use a valid repository-relative folder such as apps/my-agent.");
  }
  return trimmed;
}

function isInside(root: string, target: string) {
  const pathFromRoot = relative(root, target);
  return pathFromRoot === "" || (!pathFromRoot.startsWith(`..${sep}`) && pathFromRoot !== "..");
}

async function isAllowedFolder(root: string, folder: string) {
  try {
    const absoluteRoot = await realpath(root);
    const target = await realpath(resolve(absoluteRoot, folder));
    const pathFromRoot = relative(absoluteRoot, target);
    return isInside(absoluteRoot, target) && (await stat(target)).isDirectory();
  } catch { return false; }
}

import Fastify from "fastify";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { registerWorkspaceRoutes } from "./workspace-routes.js";
import { WorkspaceStore } from "./workspace-store.js";

let directory = "";
afterEach(async () => { if (directory) await rm(directory, { recursive: true, force: true }); });

it("persists projects and conversations and applies project lifecycle actions", async () => {
  directory = await mkdtemp(join(tmpdir(), "zetro-workspace-"));
  await mkdir(join(directory, "project-one"));
  const app = Fastify();
  registerWorkspaceRoutes(app, new WorkspaceStore(join(directory, "workspace.db"), { repositoryRoot: directory, githubUrl: "", enabledAgentIds: ["zetro"], defaultAgentId: "zetro" }), async () => [{ id: "zetro", name: "Zetro", duty: "Test", skills: [], configured: true }]);
  const project = { id: "project-one", name: "Project One", projectNumber: "PRJ-0001", icon: "PO", color: "blue", gitRepositoryUrl: "https://github.com/codexsun/project-one.git", status: "planning", pinned: true, localFolder: "project-one" };
  const conversation = { id: "chat-one", title: "First chat", updatedAt: new Date().toISOString(), exchanges: [], projectId: project.id };

  expect((await app.inject({ method: "PUT", url: `/api/v1/zetro/workspace/projects/${project.id}`, payload: project })).statusCode).toBe(200);
  expect((await app.inject({ method: "GET", url: "/api/v1/zetro/workspace" })).json().projects[0]).toMatchObject({ projectNumber: "PRJ-0001", icon: "PO", color: "blue", status: "planning" });
  expect((await app.inject({ method: "GET", url: "/api/v1/zetro/workspace/folders" })).json().folders).toEqual([".", "project-one"]);
  const createdFolder = await app.inject({ method: "POST", url: "/api/v1/zetro/workspace/folders", payload: { folder: "agents/image" } });
  expect(createdFolder.statusCode).toBe(201);
  expect(createdFolder.json()).toEqual({ folder: "agents/image", created: true });
  expect((await app.inject({ method: "GET", url: "/api/v1/zetro/workspace/folders" })).json().folders).toEqual([".", "agents", "agents/image", "project-one"]);
  expect((await app.inject({ method: "POST", url: "/api/v1/zetro/workspace/folders", payload: { folder: "../escape" } })).statusCode).toBe(400);
  expect((await app.inject({ method: "POST", url: "/api/v1/zetro/workspace/folders", payload: { folder: join(directory, "absolute") } })).statusCode).toBe(400);
  const settings = { repositoryRoot: join(directory, "project-one"), githubUrl: "https://github.com/codexsun/project-one", enabledAgentIds: ["zetro"], defaultAgentId: "zetro" };
  expect((await app.inject({ method: "PUT", url: "/api/v1/zetro/settings", payload: settings })).statusCode).toBe(200);
  expect((await app.inject({ method: "GET", url: "/api/v1/zetro/settings" })).json()).toMatchObject({ githubUrl: settings.githubUrl, enabledAgentIds: ["zetro"], defaultAgentId: "zetro" });
  expect((await app.inject({ method: "GET", url: "/api/v1/zetro/workspace/folders" })).json().root).toBe(join(directory, "project-one"));
  expect((await app.inject({ method: "PUT", url: "/api/v1/zetro/settings", payload: { ...settings, defaultAgentId: "missing", enabledAgentIds: ["missing"] } })).statusCode).toBe(400);
  expect((await app.inject({ method: "PUT", url: "/api/v1/zetro/settings", payload: { ...settings, repositoryRoot: join(directory, "missing") } })).statusCode).toBe(400);
  expect((await app.inject({ method: "PUT", url: "/api/v1/zetro/settings", payload: { ...settings, repositoryRoot: directory } })).statusCode).toBe(200);
  expect((await app.inject({ method: "PUT", url: "/api/v1/zetro/workspace/projects/escape", payload: { id: "escape", name: "Escape", localFolder: ".." } })).statusCode).toBe(400);
  expect((await app.inject({ method: "PUT", url: `/api/v1/zetro/workspace/conversations/${conversation.id}`, payload: conversation })).statusCode).toBe(200);
  const archived = await app.inject({ method: "POST", url: `/api/v1/zetro/workspace/projects/${project.id}/archive-chats` });
  expect(archived.json().conversations[0].archived).toBe(true);
  const removed = await app.inject({ method: "DELETE", url: `/api/v1/zetro/workspace/projects/${project.id}` });
  expect(removed.json()).toMatchObject({ projects: [], conversations: [{ id: conversation.id, archived: true }] });
  expect(removed.json().conversations[0].projectId).toBeUndefined();
  await app.close();
});

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { workspaceSchema } from "./workspace-contracts.js";
import { WorkspaceStore } from "./workspace-store.js";

const file = process.env.ZETRO_WORKSPACE_DATABASE_FILE ?? resolve(import.meta.dirname, "../state/workspace.db");
const store = new WorkspaceStore(file, {
  repositoryRoot: process.env.ZETRO_PROJECTS_ROOT || process.cwd(), githubUrl: "",
  enabledAgentIds: ["zxa"], defaultAgentId: "zxa", runtimeTarget: "docker-local", vpsAgentUrl: "",
}, process.env.ZETRO_SETTINGS_FILE || undefined);
try {
  const sample = workspaceSchema.parse(JSON.parse(readFileSync(resolve(import.meta.dirname, "../sample-workspace.json"), "utf8")));
  const current = store.snapshot();
  for (const project of sample.projects) if (!current.projects.some((item) => item.id === project.id)) store.saveProject(project);
  for (const conversation of sample.conversations) if (!current.conversations.some((item) => item.id === conversation.id)) store.saveConversation(conversation);
  console.log("Sample projects and discussion are available. Existing records were preserved. No tasks were started.");
} finally { store.close(); }


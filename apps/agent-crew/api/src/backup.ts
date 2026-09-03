import { createHash } from "node:crypto";
import { lstat, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import { agentProfileSchema } from "@codexsun/zetro-api/contracts";

const archiveSchema = z.object({
  schemaVersion: z.literal(1), agentId: z.string(), createdAt: z.string(),
  files: z.array(z.object({
    path: z.string().regex(/^(profile\/agent\.json|profile\/skills\/[a-z0-9-]+\.md|state\/memory\.md|state\/conversations\/[0-9a-f-]{36}\.json)$/u),
    content: z.string(), sha256: z.string().length(64),
  })).max(10_000),
});

export async function backup(profileDirectory: string, stateDirectory: string, destination: string) {
  const files = [];
  for (const [prefix, directory] of [["profile", profileDirectory], ["state", stateDirectory]] as const) {
    for (const path of await listFiles(directory)) {
      const content = await readFile(join(directory, path), "utf8");
      files.push({ path: `${prefix}/${path}`, content, sha256: digest(content) });
    }
  }
  const profile = agentProfileSchema.parse(JSON.parse(await readFile(join(profileDirectory, "agent.json"), "utf8")));
  const archive = archiveSchema.parse({ schemaVersion: 1, agentId: profile.id, createdAt: new Date().toISOString(), files });
  await writeFile(destination, JSON.stringify(archive), { flag: "wx", mode: 0o600 });
}

export async function restore(source: string, profileDirectory: string, stateDirectory: string, expectedAgentId: string) {
  const archive = archiveSchema.parse(JSON.parse(await readFile(source, "utf8")));
  if (archive.agentId !== expectedAgentId) throw new Error("Backup agent identity mismatch.");
  if (new Set(archive.files.map((file) => file.path)).size !== archive.files.length) throw new Error("Duplicate archive path.");
  for (const file of archive.files) if (digest(file.content) !== file.sha256) throw new Error("Backup checksum mismatch.");
  const profileFile = archive.files.find((file) => file.path === "profile/agent.json");
  const profile = agentProfileSchema.parse(JSON.parse(profileFile?.content ?? "null"));
  if (profile.id !== expectedAgentId || profile.skills.some((skill) => !archive.files.some((file) => file.path === `profile/skills/${skill}`))) throw new Error("Backup profile or skills are incomplete.");
  for (const directory of [profileDirectory, stateDirectory]) {
    await mkdir(directory, { recursive: true });
    if ((await readdir(directory)).length) throw new Error("Restore requires empty destination directories.");
  }
  for (const file of archive.files) {
    const [prefix, ...parts] = file.path.split("/");
    const directory = prefix === "profile" ? profileDirectory : stateDirectory;
    await mkdir(join(directory, ...parts.slice(0, -1)), { recursive: true });
    await writeFile(join(directory, ...parts), file.content, { flag: "wx", mode: 0o600 });
  }
}

async function listFiles(directory: string, prefix = ""): Promise<string[]> {
  const files: string[] = [];
  for (const name of await readdir(directory)) {
    const path = join(directory, name);
    const stat = await lstat(path);
    if (stat.isSymbolicLink()) throw new Error("Backup cannot contain symbolic links.");
    if (stat.isDirectory()) files.push(...await listFiles(path, `${prefix}${name}/`));
    else files.push(`${prefix}${name}`);
  }
  return files;
}

function digest(content: string) { return createHash("sha256").update(content).digest("hex"); }

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [operation, file, agentId] = process.argv.slice(2);
  if (!file || !["backup", "restore"].includes(operation ?? "")) throw new Error("Use backup <file> or restore <file> <agent-id>.");
  if (operation === "backup") await backup("/profile", "/state", file);
  else if (agentId) await restore(file, "/profile", "/state", agentId);
  else throw new Error("Restore requires an expected agent identity.");
}

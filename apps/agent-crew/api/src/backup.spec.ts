import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { backup, restore } from "./backup.js";

describe("agent backup", () => {
  it("restores verified profile, skills, memory, and conversations", async () => {
    const root = await mkdtemp(join(tmpdir(), "agent-backup-"));
    const profile = join(root, "profile"); const state = join(root, "state");
    await mkdir(join(profile, "skills"), { recursive: true }); await mkdir(join(state, "conversations"), { recursive: true });
    await writeFile(join(profile, "agent.json"), JSON.stringify({ id: "article-agent", name: "Article Agent", duty: "Draft.", skills: ["article.md"] }));
    await writeFile(join(profile, "skills", "article.md"), "Write clearly."); await writeFile(join(state, "memory.md"), "Reviewed memory.");
    const archive = join(root, "archive.json"); await backup(profile, state, archive);
    const targetProfile = join(root, "target-profile"); const targetState = join(root, "target-state");
    await restore(archive, targetProfile, targetState, "article-agent");
    expect(await readFile(join(targetState, "memory.md"), "utf8")).toBe("Reviewed memory.");
  });
});

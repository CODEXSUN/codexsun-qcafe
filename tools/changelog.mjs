import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export function readLatestVersionedChangelogEntry(root) {
  const content = readFileSync(resolve(root, "assist", "documentation", "CHANGELOG.md"), "utf8");
  const match = content.match(/^### \[v (\d+\.\d+\.(\d+))\] .+? - (.+)$/mu);
  if (!match) throw new Error("The changelog has no versioned entry.");
  return { reference: Number(match[2]), title: match[3].trim(), version: match[1] };
}

export function formatChangelogCommitSubject(entry) {
  return `#${entry.reference} - ${entry.title}`;
}

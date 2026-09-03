#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { pathToFileURL } from "node:url";
import { formatChangelogCommitSubject, readLatestVersionedChangelogEntry } from "./changelog.mjs";
import { bumpNextVersion, detectDatabaseUpdate } from "./version-bump.mjs";

const ROOT = resolve(import.meta.dirname, "..");

export function renderReviewBox({ fileCount, subject, version }) {
  const rows = ["GitHub Commit Review", `Version: ${version}`, `Subject: ${subject}`, `Files: ${fileCount}`];
  const width = Math.max(...rows.map((row) => row.length)) + 4;
  const border = `+${"-".repeat(width)}+`;
  const lines = rows.map((row) => `| ${row.padEnd(width - 2)} |`);
  return ["", border, ...lines, border, ""].join("\n");
}

export async function main(args = process.argv.slice(2)) {
  let entry = readLatestVersionedChangelogEntry(ROOT);
  let defaultSubject = formatChangelogCommitSubject(entry);
  const files = git(["status", "--porcelain", "--untracked-files=all"], true).split(/\r?\n/u).filter(Boolean);

  console.log("");
  for (const file of files) console.log(file);
  console.log(renderReviewBox({ fileCount: files.length, subject: defaultSubject, version: entry.version }));

  if (args.includes("--dry-run")) {
    console.log("Dry run only. No version bump, pull, commit, or push was performed.\n");
    return;
  }

  if (!process.stdin.isTTY) throw new Error("Interactive terminal input is required for github:now.");

  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const bumpAnswer = await prompt.question(" Bump next version before commit? [y/N]: ");
    if (isYes(bumpAnswer)) {
      const titleAnswer = await prompt.question(" Version title [Version update]: ");
      const title = titleAnswer.trim() || "Version update";
      const result = bumpNextVersion(ROOT, title, detectDatabaseUpdate(ROOT));
      entry = readLatestVersionedChangelogEntry(ROOT);
      defaultSubject = formatChangelogCommitSubject(entry);
      console.log(`\n Bumped ${result.currentVersion} -> ${result.nextVersion}`);
      console.log(` Subject: ${defaultSubject}\n`);
    }

    const answer = await prompt.question(` Commit message [${defaultSubject}]: `);
    const subject = answer.trim() || defaultSubject;
    const confirmation = await prompt.question(" Continue with pull, commit, and push? [y/N]: ");
    if (!isYes(confirmation)) throw new Error("Cancelled.");
    pullIfNeeded();
    git(["add", "-A"]);
    git(["commit", "-m", subject]);
    git(["push"]);
    console.log(`\nDone - ${subject}\n`);
  } finally {
    prompt.close();
  }
}

function isYes(value) {
  return ["y", "yes"].includes(value.trim().toLowerCase());
}

function pullIfNeeded() {
  const upstream = git(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"], true, true);
  if (!upstream) return;
  git(["fetch", "--quiet"]);
  const behind = Number(git(["rev-list", "--count", `HEAD..${upstream}`], true));
  if (behind > 0) git(["pull", "--rebase", "--autostash"]);
}

function git(args, silent = false, allowFailure = false) {
  try {
    return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", stdio: silent ? ["ignore", "pipe", "ignore"] : "inherit" })?.trimEnd() ?? "";
  } catch (error) {
    if (allowFailure) return "";
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`\n${error.message}\n`);
    process.exitCode = 1;
  });
}

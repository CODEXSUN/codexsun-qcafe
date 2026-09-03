#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = resolve(import.meta.dirname, "..");

export function bumpNextVersion(root, title, databaseUpdate) {
  const files = findWorkspacePackageFiles(root);
  const currentVersion = readJson(resolve(root, "package.json")).version;
  const nextVersion = bumpPatch(currentVersion);
  for (const file of files) updateJsonVersion(file, nextVersion);
  updatePackageLock(root, files, nextVersion);
  updateChangelog(root, nextVersion, title, databaseUpdate);
  return { currentVersion, nextVersion };
}

export function detectDatabaseUpdate(root) {
  const output = execFileSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" });
  return output
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((line) => line.slice(3).replace(/^.* -> /u, ""))
    .some((file) => /(^|[\\/])(database|db|migrations?|schema)([\\/.]|$)|\.(migration|schema)\.[cm]?[jt]sx?$/iu.test(file));
}

export function findWorkspacePackageFiles(root) {
  const rootPackage = resolve(root, "package.json");
  const files = new Set([rootPackage]);
  for (const pattern of readJson(rootPackage).workspaces ?? []) {
    for (const directory of expandPattern(root, pattern)) {
      const file = join(directory, "package.json");
      if (existsSync(file)) files.add(file);
    }
  }
  return [...files].sort();
}

export function bumpPatch(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/u.exec(version);
  if (!match) throw new Error(`Unsupported version: ${version}`);
  return `${match[1]}.${match[2]}.${Number(match[3]) + 1}`;
}

function expandPattern(root, pattern) {
  let directories = [root];
  for (const part of pattern.split(/[\\/]/u).filter(Boolean)) {
    directories = directories.flatMap((directory) => {
      if (part !== "*") {
        const next = join(directory, part);
        return existsSync(next) ? [next] : [];
      }
      return readdirSync(directory)
        .map((name) => join(directory, name))
        .filter((path) => statSync(path).isDirectory());
    });
  }
  return directories;
}

function updateJsonVersion(file, version) {
  const value = readJson(file);
  value.version = version;
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function updatePackageLock(root, packageFiles, version) {
  const file = resolve(root, "package-lock.json");
  if (!existsSync(file)) return;
  const lock = readJson(file);
  lock.version = version;
  const paths = new Set(packageFiles.map((item) => relative(root, dirname(item)).replaceAll("\\", "/")));
  for (const [path, value] of Object.entries(lock.packages ?? {})) {
    if (path === "" || paths.has(path)) value.version = version;
  }
  writeFileSync(file, `${JSON.stringify(lock, null, 2)}\n`);
}

function updateChangelog(root, version, title, databaseUpdate) {
  const file = resolve(root, "assist", "documentation", "CHANGELOG.md");
  let content = readFileSync(file, "utf8")
    .replace(/Current version: .*/u, `Current version: ${version}`)
    .replace(/Release tag: .*/u, `Release tag: v-${version}`)
    .replace(/Changelog label: .*/u, `Changelog label: v ${version}`);
  const entry = [
    `## v-${version}`,
    "",
    `### [v ${version}] ${formatTimestamp()} - ${title}`,
    "",
    "#### Database Changes",
    "",
    `- Database update: ${databaseUpdate ? "Yes" : "No"}.`,
    "",
    "#### App Codebase Changes",
    "",
    `- Bumped the workspace version to ${version}.`,
    "",
  ].join("\n");
  const index = content.indexOf("## v-");
  content = `${content.slice(0, index)}${entry}\n${content.slice(index)}`;
  writeFileSync(file, content);
}

function formatTimestamp() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit", hour: "numeric", hour12: true, minute: "2-digit",
    month: "2-digit", timeZone: "Asia/Kolkata", year: "numeric",
  }).formatToParts(new Date());
  const get = (type) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")} ${get("dayPeriod").toLowerCase()}`;
}

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function readFlag(args) {
  if (args.includes("--database-update")) return true;
  if (args.includes("--no-database-update")) return false;
  throw new Error("Choose --database-update or --no-database-update.");
}

function readTitle(args) {
  const index = args.indexOf("--title");
  return index >= 0 && args[index + 1] ? args[index + 1] : "Version update";
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = bumpNextVersion(ROOT, readTitle(process.argv.slice(2)), readFlag(process.argv.slice(2)));
    console.log(`Bumped ${result.currentVersion} -> ${result.nextVersion}`);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

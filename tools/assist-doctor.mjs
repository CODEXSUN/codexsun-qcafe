#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = resolve(import.meta.dirname, "..");
const SOURCE_EXTENSIONS = new Set([".css", ".ts", ".tsx"]);
const SKIPPED_DIRECTORIES = new Set(["dist", "node_modules"]);

export function loadAssistManifest(root) {
  return JSON.parse(readFileSync(resolve(root, "assist/manifest.json"), "utf8"));
}

export function validateAssistManifest(manifest, root) {
  const issues = [];
  if (manifest.schemaVersion !== 1) issues.push("manifest.schemaVersion must equal 1.");
  if (!Array.isArray(manifest.modules) || manifest.modules.length === 0) return [...issues, "manifest.modules must contain at least one module."];

  const moduleIds = new Set();
  for (const module of manifest.modules) {
    if (!validModule(module)) {
      issues.push(`Invalid module ownership entry: ${JSON.stringify(module)}.`);
      continue;
    }
    if (moduleIds.has(module.id)) issues.push(`Duplicate module ownership ID: ${module.id}.`);
    moduleIds.add(module.id);
    for (const sourceRoot of module.roots) {
      if (!existsSync(resolve(root, sourceRoot))) issues.push(`${module.id} source root is missing: ${sourceRoot}.`);
    }
  }
  return issues;
}

export function inspectWorkingTree(root, manifest) {
  const changedFiles = readChangedFiles(root);
  return changedFiles.map((path) => ({
    path,
    protected: manifest.modules.some((module) => module.protectedPaths.some((protectedPath) => within(path, protectedPath))),
    owner: ownerFor(path, manifest.modules),
  }));
}

export function findExactSourceDuplicates(root, manifest) {
  const paths = ["apps", "packages"].flatMap((directory) => readSourceFiles(resolve(root, directory)));
  const groups = new Map();
  for (const path of paths) {
    const hash = createHash("sha256").update(readFileSync(path)).digest("hex");
    const members = groups.get(hash) ?? [];
    members.push(relative(root, path).replaceAll(sep, "/"));
    groups.set(hash, members);
  }
  return [...groups.values()]
    .filter((paths) => paths.length > 1)
    .map((paths) => ({
      classification: duplicateClassification(paths, manifest.modules),
      paths: paths.sort(),
    }))
    .sort((left, right) => left.paths[0].localeCompare(right.paths[0]));
}

export function runAssistDoctor(root = ROOT) {
  const manifest = loadAssistManifest(root);
  const issues = validateAssistManifest(manifest, root);
  return {
    duplicateSources: findExactSourceDuplicates(root, manifest),
    issues,
    modules: manifest.modules.map(({ id, owner, publicContracts, roots }) => ({ id, owner, publicContracts, roots })),
    workingTree: inspectWorkingTree(root, manifest),
  };
}

function readChangedFiles(root) {
  const output = execFileSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" });
  return output.split(/\r?\n/u).filter(Boolean).map((line) => line.slice(3).replace(/^.* -> /u, "").replaceAll("\\", "/"));
}

function readSourceFiles(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory).flatMap((name) => {
    if (SKIPPED_DIRECTORIES.has(name)) return [];
    const path = join(directory, name);
    if (statSync(path).isDirectory()) return readSourceFiles(path);
    return SOURCE_EXTENSIONS.has(extension(path)) ? [path] : [];
  });
}

function duplicateClassification(paths, modules) {
  const owners = new Set(paths.map((path) => ownerFor(path, modules)?.id).filter(Boolean));
  return owners.size === 1 ? "needs-migration" : "needs-owner-decision";
}

function ownerFor(path, modules) {
  return modules
    .filter((module) => module.roots.some((root) => within(path, root)))
    .sort((left, right) => longestRoot(right) - longestRoot(left))[0];
}

function longestRoot(module) {
  return Math.max(...module.roots.map((root) => root.length));
}

function within(path, root) {
  return path === root || path.startsWith(`${root}/`);
}

function extension(path) {
  return path.slice(path.lastIndexOf("."));
}

function validModule(module) {
  return typeof module?.id === "string"
    && typeof module.owner === "string"
    && Array.isArray(module.roots)
    && Array.isArray(module.publicContracts)
    && Array.isArray(module.protectedPaths)
    && module.roots.every(validPath)
    && module.protectedPaths.every(validPath);
}

function validPath(value) {
  return typeof value === "string" && value.length > 0 && !value.startsWith("/") && !value.includes("\\") && !value.split("/").includes("..");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = runAssistDoctor();
  const strict = process.argv.includes("--strict");
  console.log(process.argv.includes("--json") ? JSON.stringify(report, null, 2) : formatReport(report));
  if (strict && report.issues.length > 0) process.exit(1);
}

function formatReport(report) {
  const protectedChanges = report.workingTree.filter((item) => item.protected);
  const lines = [
    "CODEXSUN Assist Doctor",
    `- Owned modules: ${report.modules.length}`,
    `- Manifest issues: ${report.issues.length}`,
    `- Protected working-tree changes: ${protectedChanges.length}`,
    `- Exact duplicate source groups: ${report.duplicateSources.length}`,
  ];
  for (const issue of report.issues) lines.push(`- Issue: ${issue}`);
  for (const group of report.duplicateSources) lines.push(`- ${group.classification}: ${group.paths.join(" | ")}`);
  return lines.join("\n");
}

#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { findWorkspacePackageFiles } from "./version-bump.mjs";

const ROOT = resolve(import.meta.dirname, "..");
const rootVersion = readJson(resolve(ROOT, "package.json")).version;
const failures = [];

for (const file of findWorkspacePackageFiles(ROOT)) {
  const version = readJson(file).version;
  if (version !== rootVersion) failures.push(`${relative(ROOT, file)} uses ${version}.`);
}

const lock = readJson(resolve(ROOT, "package-lock.json"));
if (lock.version !== rootVersion) failures.push(`package-lock.json uses ${lock.version}.`);
if (lock.packages?.[""]?.version !== rootVersion) failures.push("The package-lock root version differs.");

const changelog = readFileSync(resolve(ROOT, "assist", "documentation", "CHANGELOG.md"), "utf8");
for (const expected of [
  `Current version: ${rootVersion}`,
  `Release tag: v-${rootVersion}`,
  `Changelog label: v ${rootVersion}`,
  `## v-${rootVersion}`,
]) {
  if (!changelog.includes(expected)) failures.push(`The changelog is missing: ${expected}`);
}

if (failures.length) {
  console.error(`Version check failed for ${rootVersion}:`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`Version check passed for ${rootVersion}.`);

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

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

checkTauriDesktop("apps/platform/core/desktop/src-tauri", "codexsun-desktop");

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
console.log(`CODEXSUN OS version check passed for ${rootVersion}.`);

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function checkTauriDesktop(path, packageName) {
  const root = resolve(ROOT, path);
  const tauriVersion = readJson(resolve(root, "tauri.conf.json")).version;
  if (tauriVersion !== rootVersion) failures.push(`${path}/tauri.conf.json uses ${tauriVersion}.`);
  const cargoToml = readFileSync(resolve(root, "Cargo.toml"), "utf8");
  const cargoTomlVersion = /^version = "([^"]+)"$/mu.exec(cargoToml)?.[1];
  if (cargoTomlVersion !== rootVersion) failures.push(`${path}/Cargo.toml uses ${cargoTomlVersion ?? "no version"}.`);
  const cargoLock = readFileSync(resolve(root, "Cargo.lock"), "utf8");
  const cargoLockVersion = new RegExp(`name = "${packageName}"\\r?\\nversion = "([^"]+)"`, "u").exec(cargoLock)?.[1];
  if (cargoLockVersion !== rootVersion) failures.push(`${path}/Cargo.lock uses ${cargoLockVersion ?? "no version"}.`);
}

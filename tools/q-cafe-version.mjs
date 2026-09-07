#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const versionFile = resolve(root, "apps", "q-cafe", "version.json");
const args = process.argv.slice(2);
const versionArgument = valueAfter("--version");
const title = valueAfter("--title") ?? "Q Cafe release";

if (args.includes("--check")) {
  checkVersion();
  console.log(`Q Cafe version check passed for ${qCafeVersion()}.`);
  process.exit(0);
}

if (versionArgument) {
  assertVersion(versionArgument);
  setVersion(versionArgument, title);
  console.log(`Q Cafe version set to ${versionArgument}.`);
  process.exit(0);
}

console.log(qCafeVersion());

function qCafeVersion() {
  return readJson(versionFile).version;
}

function setVersion(version, changelogTitle) {
  const source = readJson(versionFile);
  source.version = version;
  writeJson(versionFile, source);

  for (const file of qCafePackageFiles()) updateJsonVersion(file, version);
  updateQCafePackageLock(version);
  updateTauriVersion(version);
  prependChangelog(version, changelogTitle);
}

function checkVersion() {
  const version = qCafeVersion();
  assertVersion(version);
  const failures = [];

  for (const file of qCafePackageFiles()) {
    if (readJson(file).version !== version) failures.push(`${relative(root, file)} uses ${readJson(file).version}.`);
  }

  const desktopRoot = resolve(root, "apps", "q-cafe", "desktop", "src-tauri");
  const tauriVersion = readJson(resolve(desktopRoot, "tauri.conf.json")).version;
  if (tauriVersion !== version) failures.push(`apps/q-cafe/desktop/src-tauri/tauri.conf.json uses ${tauriVersion}.`);

  const cargoToml = readFileSync(resolve(desktopRoot, "Cargo.toml"), "utf8");
  const cargoVersion = /^version = "([^"]+)"$/mu.exec(cargoToml)?.[1];
  if (cargoVersion !== version) failures.push(`apps/q-cafe/desktop/src-tauri/Cargo.toml uses ${cargoVersion ?? "no version"}.`);

  const cargoLock = readFileSync(resolve(desktopRoot, "Cargo.lock"), "utf8");
  const cargoLockVersion = /name = "q-cafe-desktop"\r?\nversion = "([^"]+)"/u.exec(cargoLock)?.[1];
  if (cargoLockVersion !== version) failures.push(`apps/q-cafe/desktop/src-tauri/Cargo.lock uses ${cargoLockVersion ?? "no version"}.`);

  const lock = readJson(resolve(root, "package-lock.json"));
  for (const path of qCafePackagePaths()) {
    if (lock.packages?.[path]?.version !== version) failures.push(`package-lock.json ${path} uses ${lock.packages?.[path]?.version ?? "no version"}.`);
  }

  const changelog = readFileSync(resolve(root, "apps", "q-cafe", "CHANGELOG.md"), "utf8");
  if (!changelog.includes(`## ${version} -`)) failures.push(`apps/q-cafe/CHANGELOG.md is missing ${version}.`);

  if (failures.length) throw new Error(`Q Cafe version check failed for ${version}:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
}

function qCafePackageFiles() {
  return ["api", "web", "desktop"].map((part) => resolve(root, "apps", "q-cafe", part, "package.json"));
}

function qCafePackagePaths() {
  return qCafePackageFiles().map((file) => relative(root, dirname(file)).replaceAll("\\", "/"));
}

function updateQCafePackageLock(version) {
  const file = resolve(root, "package-lock.json");
  if (!existsSync(file)) return;
  const lock = readJson(file);
  for (const path of qCafePackagePaths()) {
    if (!lock.packages?.[path]) throw new Error(`package-lock.json is missing ${path}.`);
    lock.packages[path].version = version;
  }
  writeJson(file, lock);
}

function updateTauriVersion(version) {
  const desktopRoot = resolve(root, "apps", "q-cafe", "desktop", "src-tauri");
  updateJsonVersion(resolve(desktopRoot, "tauri.conf.json"), version);
  replaceVersion(resolve(desktopRoot, "Cargo.toml"), /^version = ".*"$/mu, `version = "${version}"`);
  replaceVersion(
    resolve(desktopRoot, "Cargo.lock"),
    /(name = "q-cafe-desktop"\r?\nversion = ")[^"]+/u,
    `$1${version}`,
  );
}

function prependChangelog(version, changelogTitle) {
  const file = resolve(root, "apps", "q-cafe", "CHANGELOG.md");
  const content = readFileSync(file, "utf8");
  const entry = `## ${version} - ${new Date().toISOString().slice(0, 10)}\n\n### ${changelogTitle}\n\n- Q Cafe now uses apps/q-cafe/version.json as the single source for its API, web, desktop, updater, installer, and changelog version.\n\n`;
  const firstRelease = content.indexOf("## ");
  writeFileSync(file, `${content.slice(0, firstRelease)}${entry}${content.slice(firstRelease)}`);
}

function updateJsonVersion(file, version) {
  const value = readJson(file);
  value.version = version;
  writeJson(file, value);
}

function replaceVersion(file, expression, replacement) {
  const content = readFileSync(file, "utf8");
  const next = content.replace(expression, replacement);
  if (next === content) throw new Error(`Could not update the version in ${relative(root, file)}.`);
  writeFileSync(file, next);
}

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function writeJson(file, value) {
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function valueAfter(flag) {
  const index = args.indexOf(flag);
  return index === -1 ? undefined : args[index + 1];
}

function assertVersion(version) {
  if (!/^\d+\.\d+\.\d+$/u.test(version)) throw new Error(`Unsupported Q Cafe version: ${version}`);
}

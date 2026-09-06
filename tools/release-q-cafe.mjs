#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const version = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")).version;
const tag = `v-${version}`;
const release = resolve(root, "apps", "q-cafe", "desktop", "release");
const assets = [
  `qcafe-${version}-x64-setup.exe`,
  `qcafe-${version}-x64.msi`,
  `qcafe-${version}-x64-setup.zip`,
  "qcafe-update.json",
  "qcafe-checksums.txt",
].map(name => resolve(release, name));
const publish = process.argv.includes("--publish");

assertCleanSource();
run("npm.cmd", ["run", "check"]);
run("npm.cmd", ["run", "build:q-cafe:windows"]);
for (const asset of assets) if (!existsSync(asset)) throw new Error(`Q Cafe release asset is missing: ${asset}`);
if (!publish) { console.log(`Q Cafe ${version} release prepared. Run with --publish after review to create ${tag} and publish GitHub assets.`); process.exit(0); }
run("git", ["tag", "-a", tag, "-m", `Q Cafe ${version} - ${releaseTitle()}`]);
run("git", ["push", "origin", tag]);
run("gh", ["release", "create", tag, ...assets, "--repo", "CODEXSUN/codexsun", "--title", `Q Cafe ${version}`, "--notes", releaseNotes()]);
console.log(`Published Q Cafe ${version}: ${tag}`);

function assertCleanSource() {
  const status = output("git", ["status", "--porcelain"]);
  if (status) throw new Error("Commit and push the reviewed source before publishing a Q Cafe release.");
}
function releaseTitle() {
  const changelog = readFileSync(resolve(root, "apps", "q-cafe", "CHANGELOG.md"), "utf8");
  return changelog.match(/^##\s+[^\n]+\n+\n###\s+([^\n]+)/m)?.[1] ?? "Windows update";
}
function releaseNotes() { return `## Q Cafe ${version}\n\n${releaseTitle()}\n\nIncludes the verified Windows installer, MSI, checksums, and update manifest.`; }
function run(command, args) {
  execFileSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32" && command.endsWith(".cmd"),
  });
}
function output(command, args) { return execFileSync(command, args, { cwd: root, encoding: "utf8" }).trim(); }

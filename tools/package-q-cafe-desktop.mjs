#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const version = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')).version;
const bundle = resolve(root, 'apps', 'q-cafe', 'desktop', 'src-tauri', 'target', 'release', 'bundle');
const release = resolve(root, 'apps', 'q-cafe', 'desktop', 'release');

mkdirSync(release, { recursive: true });
const exeFile = `qcafe-${version}-x64-setup.exe`;
const msiFile = `qcafe-${version}-x64.msi`;
const zipFile = `qcafe-${version}-x64-setup.zip`;
const updateFile = 'qcafe-update.json';
const checksumsFile = 'qcafe-checksums.txt';

for (const name of [exeFile, msiFile, zipFile, updateFile, checksumsFile]) rmSync(resolve(release, name), { force: true });
copyArtifact(resolve(bundle, 'nsis'), '.exe', resolve(release, exeFile), version);
copyArtifact(resolve(bundle, 'msi'), '.msi', resolve(release, msiFile), version);

try {
  execFileSync('tar.exe', ['-a', '-c', '-f', resolve(release, zipFile), '-C', release, exeFile, msiFile]);
  console.log(resolve(release, zipFile));
} catch (error) {
  try {
    execFileSync('powershell.exe', [
      '-NoProfile',
      '-Command',
      `Compress-Archive -Path '${resolve(release, exeFile)}','${resolve(release, msiFile)}' -DestinationPath '${resolve(release, zipFile)}' -Force`
    ]);
    console.log(resolve(release, zipFile));
  } catch (psErr) {
    console.warn('Zip creation failed:', error.message, psErr.message);
  }
}

writeUpdateFiles({ release, version, exeFile, msiFile, zipFile, updateFile, checksumsFile });
console.log(`Q Cafe installers ready in ${release}`);

function copyArtifact(directory, extension, destination, version) {
  const candidates = existsSync(directory)
    ? readdirSync(directory)
      .filter(name => name.toLowerCase().endsWith(extension))
      .map(name => ({ name, path: resolve(directory, name) }))
    : [];
  const exact = candidates.find(c => c.name.includes(`_${version}_`) || c.name.includes(`_${version}-`));
  const source = exact ? exact.path : (candidates[0] ? candidates[0].path : undefined);
  if (!source) throw new Error(`Q Cafe ${extension} installer was not produced.`);
  cpSync(source, destination);
  console.log(destination);
}

function writeUpdateFiles({ release, version, exeFile, msiFile, zipFile, updateFile, checksumsFile }) {
  const files = [exeFile, msiFile, zipFile];
  const checksums = files.map(name => ({ name, sha256: hash(resolve(release, name)) }));
  const tag = `qcafe-${version}`;
  const base = `https://github.com/CODEXSUN/codexsun/releases/download/${tag}`;
  const manifest = {
    schemaVersion: 1,
    version,
    stable: true,
    notes: `Q Cafe ${version} Windows update.`,
    installer: { url: `${base}/${exeFile}`, sha256: checksums.find(file => file.name === exeFile).sha256 },
    assets: checksums.map(file => ({ ...file, url: `${base}/${file.name}` })),
  };
  writeFileSync(resolve(release, updateFile), `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(resolve(release, checksumsFile), checksums.map(file => `${file.sha256}  ${file.name}`).join("\n") + "\n");
  console.log(resolve(release, updateFile));
  console.log(resolve(release, checksumsFile));
}

function hash(file) { return createHash("sha256").update(readFileSync(file)).digest("hex"); }

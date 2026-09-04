#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const version = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')).version;
const bundle = resolve(root, 'apps', 'q-cafe', 'desktop', 'src-tauri', 'target', 'release', 'bundle');
const release = resolve(root, 'apps', 'q-cafe', 'desktop', 'release');

mkdirSync(release, { recursive: true });
const exeFile = `qcafe-${version}-x64-setup.exe`;
const msiFile = `qcafe-${version}-x64.msi`;
const zipFile = `qcafe-${version}-x64-setup.zip`;

for (const name of [exeFile, msiFile, zipFile]) rmSync(resolve(release, name), { force: true });
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

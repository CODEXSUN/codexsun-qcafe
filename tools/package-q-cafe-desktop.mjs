#!/usr/bin/env node

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const version = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')).version;
const bundle = resolve(root, 'apps', 'q-cafe', 'desktop', 'src-tauri', 'target', 'release', 'bundle');
const release = resolve(root, 'apps', 'q-cafe', 'desktop', 'release');

mkdirSync(release, { recursive: true });
for (const name of [`qcafe-${version}-x64-setup.exe`, `qcafe-${version}-x64.msi`]) rmSync(resolve(release, name), { force: true });
copyArtifact(resolve(bundle, 'nsis'), '.exe', resolve(release, `qcafe-${version}-x64-setup.exe`), version);
copyArtifact(resolve(bundle, 'msi'), '.msi', resolve(release, `qcafe-${version}-x64.msi`), version);
console.log(`Q Cafe installers ready in ${release}`);

function copyArtifact(directory, extension, destination, version) {
  const source = existsSync(directory)
    ? readdirSync(directory)
      .filter(name => name.includes(`_${version}_`) && name.toLowerCase().endsWith(extension))
      .map(name => resolve(directory, name))
      .at(0)
    : undefined;
  if (!source) throw new Error(`Q Cafe ${extension} installer was not produced.`);
  cpSync(source, destination);
  console.log(destination);
}

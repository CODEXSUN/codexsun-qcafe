#!/usr/bin/env node

import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const source = resolve(process.env.QCAFE_NODE_SIDECAR_SOURCE ?? process.execPath);
const destination = resolve(root, 'apps', 'q-cafe', 'desktop', 'src-tauri', 'resources', 'node.exe');
const printServiceSource = resolve(root, 'apps', 'q-cafe', 'desktop', 'src-tauri', 'target', 'release', 'q-cafe-print-service.exe');
const printServiceDestination = resolve(root, 'apps', 'q-cafe', 'desktop', 'src-tauri', 'resources', 'q-cafe-print-service.exe');
const printServiceInstallerSource = resolve(root, 'apps', 'q-cafe', 'desktop', 'service', 'install-print-service.cjs');
const printServiceInstallerDestination = resolve(root, 'apps', 'q-cafe', 'desktop', 'src-tauri', 'resources', 'q-cafe-print-service-installer.cjs');

if (!existsSync(source)) throw new Error(`Q Cafe Node runtime was not found: ${source}`);

mkdirSync(dirname(destination), { recursive: true });
if (existsSync(destination) && process.env.QCAFE_REFRESH_NODE_SIDECAR !== '1') {
  console.log(`Using existing Q Cafe Node runtime at ${destination}`);
} else {
  copyFileSync(source, destination);
  console.log(`Staged Q Cafe Node runtime from ${source}`);
}

if (!existsSync(printServiceSource)) throw new Error(`Q Cafe print service was not built: ${printServiceSource}`);
copyFileSync(printServiceSource, printServiceDestination);
copyFileSync(printServiceInstallerSource, printServiceInstallerDestination);
console.log(`Staged Q Cafe print service at ${printServiceDestination}`);

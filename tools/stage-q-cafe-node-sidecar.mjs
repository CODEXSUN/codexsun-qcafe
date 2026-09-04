#!/usr/bin/env node

import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const source = resolve(process.env.QCAFE_NODE_SIDECAR_SOURCE ?? process.execPath);
const destination = resolve(root, 'apps', 'q-cafe', 'desktop', 'src-tauri', 'resources', 'node.exe');

if (!existsSync(source)) throw new Error(`Q Cafe Node runtime was not found: ${source}`);

mkdirSync(dirname(destination), { recursive: true });
copyFileSync(source, destination);
console.log(`Staged Q Cafe Node runtime from ${source}`);

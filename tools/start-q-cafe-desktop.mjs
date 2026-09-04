#!/usr/bin/env node

import { execFileSync, spawn } from 'node:child_process';
import { resolve } from 'node:path';

const desktop = resolve(import.meta.dirname, '..', 'apps', 'q-cafe', 'desktop');

if (process.platform === 'win32') {
  try { execFileSync('taskkill', ['/F', '/IM', 'q-cafe-desktop.exe'], { stdio: 'ignore' }); }
  catch { /* No previous Q Cafe desktop process is running. */ }
}

const child = spawn(process.platform === 'win32' ? 'cargo.exe' : 'cargo', ['tauri', 'dev'], { cwd: desktop, stdio: 'inherit' });
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => child.kill(signal));
child.once('exit', code => process.exit(code ?? 0));

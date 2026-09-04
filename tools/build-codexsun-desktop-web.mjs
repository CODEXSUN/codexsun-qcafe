#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error("The npm CLI path is unavailable.");
const env = {
  ...process.env,
  VITE_OS_API_URL: process.env.OS_DESKTOP_API_URL ?? "http://127.0.0.1:4100",
  VITE_ZETRO_API_URL: process.env.ZETRO_DESKTOP_API_URL ?? "http://127.0.0.1:4150",
  VITE_CHAT_API_URL: process.env.CHAT_DESKTOP_API_URL ?? "http://127.0.0.1:4165",
};
const result = spawnSync(process.execPath, [npmCli, "run", "build", "-w", "@codexsun/core-web"], { cwd: root, env, stdio: "inherit", windowsHide: true });
if (result.error) throw result.error;
process.exit(result.status ?? 1);

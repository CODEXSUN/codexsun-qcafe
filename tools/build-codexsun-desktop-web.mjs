#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error("The npm CLI path is unavailable.");
const env = {
  ...process.env,
  VITE_OS_CLOUD: "true",
  VITE_OS_API_URL: process.env.OS_DESKTOP_API_URL || "https://os.codexsun.com",
  VITE_ZETRO_API_URL: process.env.ZETRO_DESKTOP_API_URL || "https://os.codexsun.com",
  VITE_CHAT_API_URL: process.env.CHAT_DESKTOP_API_URL || "https://os.codexsun.com",
};
const result = spawnSync(process.execPath, [npmCli, "run", "build", "-w", "@codexsun/core-web"], { cwd: root, env, stdio: "inherit", windowsHide: true });
if (result.error) throw result.error;
process.exit(result.status ?? 1);

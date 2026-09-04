#!/usr/bin/env node

import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { getOrCreateQCafeToken, qCafeTokenPath } from "./q-cafe-token.mjs";

const root = resolve(import.meta.dirname, "..");
const savedToken = process.env.QCAFE_API_TOKEN ? null : getOrCreateQCafeToken();
const token = process.env.QCAFE_API_TOKEN ?? savedToken.token;
const databasePath = process.env.QCAFE_DATABASE_PATH ?? resolve(root, "apps", "q-cafe", ".local", "q-cafe.sqlite");

console.log(`${savedToken?.created ? "Created" : "Using"} Q Cafe development token: ${token}`);
if (savedToken) console.log(`Saved in ${qCafeTokenPath}`);

const child = spawn(process.execPath, [resolve(root, "tools", "dev-stack.mjs")], {
  cwd: root,
  env: {
    ...process.env,
    QCAFE_API_TOKEN: token,
    QCAFE_DATABASE_PATH: databasePath,
    QCAFE_DEMO: process.env.QCAFE_DEMO ?? "true",
    QCAFE_ONLY: "true",
    CODEXSUN_LOCAL_DEMO: "false",
    CODEXSUN_ZETRO_DOCKER: "false",
    VITE_QCAFE_DEV_TOKEN: token,
  },
  stdio: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => child.kill(signal));
child.once("exit", (code) => process.exit(code ?? 0));

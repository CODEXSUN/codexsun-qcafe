#!/usr/bin/env node

import { randomBytes } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(import.meta.dirname, "..");
export const neotTokenPath = resolve(root, "apps", "neot", ".local", "operator-key.txt");

export function getOrCreateNeotToken({ replace = false } = {}) {
  if (!replace && existsSync(neotTokenPath)) {
    const saved = readFileSync(neotTokenPath, "utf8").trim();
    if (saved.length >= 32) return { created: false, token: saved };
  }

  const token = randomBytes(24).toString("hex");
  mkdirSync(dirname(neotTokenPath), { recursive: true });
  writeFileSync(neotTokenPath, `${token}\n`, { encoding: "utf8", mode: 0o600 });
  try { chmodSync(neotTokenPath, 0o600); } catch { /* Windows controls access through ACLs. */ }
  return { created: true, token };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = getOrCreateNeotToken({ replace: process.argv.includes("--replace") });
  console.log(`${result.created ? "Created" : "Using"} NEOT LMS development token:`);
  console.log(result.token);
  console.log(`Saved in ${neotTokenPath}`);
}

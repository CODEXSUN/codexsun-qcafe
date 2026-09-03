#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..", "..");
const command = process.argv[2] ?? "show";

if (command === "show") {
  const version = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8")).version;
  console.log(`CODEXSUN OS version ${version}`);
} else {
  console.error(`Unknown version command: ${command}`);
  process.exit(1);
}

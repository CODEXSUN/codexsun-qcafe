#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const environmentPath = resolve(readArgument("--env") ?? ".env");
const original = readFileSync(environmentPath, "utf8");
writeFileSync(environmentPath, replaceEnvironmentValues(original, {
  OS_FIRST_LOGIN_SETUP: "false",
  OS_FIRST_LOGIN_SETUP_CODE: "",
  OS_FIRST_LOGIN_SETUP_EXPIRES_AT: "",
}));
console.log("First-login setup is disabled and the temporary code was cleared.");

function readArgument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function replaceEnvironmentValues(content, values) {
  const lineEnding = content.includes("\r\n") ? "\r\n" : "\n";
  const lines = content.split(/\r?\n/);
  const remaining = new Map(Object.entries(values));
  const updated = lines.map(line => {
    const match = /^([A-Z0-9_]+)=/.exec(line);
    if (!match || !remaining.has(match[1])) return line;
    const value = remaining.get(match[1]);
    remaining.delete(match[1]);
    return `${match[1]}=${value}`;
  });
  for (const [key, value] of remaining) updated.push(`${key}=${value}`);
  return updated.join(lineEnding);
}

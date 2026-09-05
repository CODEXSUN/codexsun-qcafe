#!/usr/bin/env node
import { randomInt } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const environmentPath = resolve(readArgument("--env") ?? ".env");
const ttlMinutes = readTtlMinutes(readArgument("--ttl-minutes") ?? "30");
const code = numericCode(10);
const expiresAt = new Date(Date.now() + ttlMinutes * 60_000).toISOString();
const original = readFileSync(environmentPath, "utf8");
const next = replaceEnvironmentValues(original, {
  OS_FIRST_LOGIN_SETUP: "true",
  OS_FIRST_LOGIN_SETUP_CODE: code,
  OS_FIRST_LOGIN_SETUP_EXPIRES_AT: expiresAt,
});

writeFileSync(environmentPath, next);
console.log(`First-login setup code: ${code}`);
console.log(`Expires: ${expiresAt}`);

function readArgument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function readTtlMinutes(value) {
  const minutes = Number.parseInt(value, 10);
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1_440) throw new Error("--ttl-minutes must be between 1 and 1440.");
  return minutes;
}

function numericCode(length) {
  return Array.from({ length }, () => randomInt(10).toString()).join("");
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

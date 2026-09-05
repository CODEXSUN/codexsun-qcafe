import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { HostingerInventory } from "./vps.service.js";

// An explicit environment file supports existing credentials without copying them.
const file = process.argv[2];
const token = file ? parseEnv(readFileSync(file, "utf8")).HOSTINGER_API_TOKEN : process.env.HOSTINGER_API_TOKEN;
try {
  const servers = await new HostingerInventory(token).list();
  console.log(JSON.stringify({ provider: "hostinger", connected: true, servers }, null, 2));
} catch {
  console.error("Hostinger connection failed. Check HOSTINGER_API_TOKEN and network access. No VPS changes were made.");
  process.exitCode = 1;
}

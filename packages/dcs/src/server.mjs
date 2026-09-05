import { readFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createDcs } from "./service.mjs";

const file = process.env.DCS_DATABASE_FILE || "/data/dcs.db";
const devices = JSON.parse(readFileSync(process.env.DCS_DEVICES_FILE || "/config/devices.json", "utf8"));
if (!Array.isArray(devices) || devices.some((device) => !device.id || !device.scope || !/^[a-f0-9]{64}$/.test(device.tokenHash))) throw new Error("Invalid DCS device configuration");
mkdirSync(dirname(file), { recursive: true });
const verifyIdentity = async (authorization) => {
  if (!authorization?.startsWith("Bearer ") || !process.env.OS_IDENTITY_URL) return undefined;
  const response = await fetch(`${process.env.OS_IDENTITY_URL}/api/v1/identity/verify`, { headers: { authorization }, signal: AbortSignal.timeout(5000), redirect: "error" });
  if (!response.ok) return undefined;
  return (await response.json()).claims;
};
const app = createDcs({ file, devices, origins: (process.env.DCS_ALLOWED_ORIGINS || "").split(",").filter(Boolean), verifyIdentity });
app.server.listen(Number(process.env.DCS_PORT || 4170), process.env.DCS_HOST || "127.0.0.1");
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, async () => { await app.close(); process.exit(0); });

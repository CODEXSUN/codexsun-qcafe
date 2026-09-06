import { randomUUID } from "node:crypto";
import { WebSocket } from "ws";

process.loadEnvFile(".env");

const baseUrl = process.env.OS_PUBLIC_BASE_URL || "https://os.codexsun.com";
const token = process.env.OS_RELEASE_DEVICE_TOKEN;
const args = Object.fromEntries(process.argv.slice(2).map((item, index, values) => item.startsWith("--") ? [item.slice(2), values[index + 1]] : []).filter(([key, value]) => key && value && !String(value).startsWith("--")));
const version = args.version || process.env.npm_package_version;
const phase = args.phase || "published";

if (!token) {
  console.log("DCS release notification pending: configure OS_RELEASE_DEVICE_TOKEN from an enrolled desktop device.");
  process.exit(0);
}

const ticketResponse = await fetch(new URL("/dcs/tickets", baseUrl), { headers: { authorization: `Bearer ${token}` }, method: "POST", signal: AbortSignal.timeout(15_000) });
if (!ticketResponse.ok) throw new Error(`Could not get a DCS release ticket: ${ticketResponse.status}.`);
const { ticket } = await ticketResponse.json();
const event = { kind: "codexsun.release", occurredAt: new Date().toISOString(), phase, version };
const id = `release_${version}_${phase}_${randomUUID().replaceAll("-", "")}`;
const socket = new WebSocket(new URL("/dcs/ws", baseUrl).toString().replace(/^http/u, "ws"), [`ticket.${ticket}`]);
const timeout = setTimeout(() => socket.terminate(), 15_000);

await new Promise((resolve, reject) => {
  socket.once("error", reject);
  socket.on("message", (bytes) => {
    const message = JSON.parse(bytes.toString());
    if (message.type === "ready") socket.send(JSON.stringify({ type: "publish", id, payload: event }));
    if (message.type === "ack" && message.id === id) resolve(message);
    if (message.type === "error") reject(new Error("DCS rejected the release notification."));
  });
});

clearTimeout(timeout);
socket.close();
console.log(`DCS release notification acknowledged for ${version} (${phase}).`);

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { WebSocket } from "ws";

process.loadEnvFile(".env");
const base = process.env.OS_PUBLIC_BASE_URL || "https://os.codexsun.com";
let token;
async function request(path, method = "GET", body) {
  const response = await fetch(base + path, { method, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body ? { "content-type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000) });
  assert.ok(response.ok, `${method} ${path}: ${response.status}`);
  return response.json();
}
function socket(path, ticket, operation) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(base.replace(/^http/, "ws") + path, [`ticket.${ticket}`]);
    const timer = setTimeout(() => { ws.terminate(); reject(new Error("WebSocket timed out")); }, 15000);
    ws.on("error", reject);
    ws.on("message", bytes => {
      try { const result = operation(JSON.parse(bytes), ws); if (result) { clearTimeout(timer); ws.close(); resolve(result); } }
      catch (error) { clearTimeout(timer); ws.terminate(); reject(error); }
    });
  });
}
const login = await request("/api/v1/identity/login", "POST", { login: process.env.OS_SUPER_ADMIN_EMAIL, password: process.env.OS_SUPER_ADMIN_PASSWORD });
token = login.accessToken;
for (const path of ["/api/v1/zetro/workspace", "/api/v1/ai-tasks", "/api/v1/chat/profile"]) await request(path);
const device = await request("/dcs/devices", "POST", { name: "Deployment verification", kind: "desktop" });
const id = randomUUID();
try {
  const ticket = async () => {
    const response = await fetch(base + "/dcs/tickets", { method: "POST", headers: { authorization: `Bearer ${device.token}` } });
    assert.equal(response.status, 201); return (await response.json()).ticket;
  };
  const ack = await socket("/dcs/ws", await ticket(), (event, ws) => {
    if (event.type === "ready") ws.send(JSON.stringify({ type: "publish", id, payload: { kind: "deployment-verification" } }));
    return event.type === "ack" ? event : undefined;
  });
  await socket("/dcs/ws", await ticket(), (event, ws) => {
    if (event.type === "ready") ws.send(JSON.stringify({ type: "pull", after: ack.seq - 1 }));
    if (event.type === "events") { assert.ok(event.events.some(item => item.id === id)); return true; }
  });
  const chat = await request("/api/v1/chat/realtime/tickets", "POST");
  await socket("/chat/ws", chat.ticket, event => event.type === "ready");
  console.log("PASS: authenticated APIs, device enrollment, durable DCS replay, separate Chat WebSocket.");
} finally { await request(`/dcs/devices/${device.deviceId}`, "DELETE"); }

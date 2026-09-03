// Temporary local simulation. Never use as a production provider.
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const agentId = process.env.AGENT_ID;
await mkdir("/state", { recursive: true });
let state;
try { state = JSON.parse(await readFile("/state/data.json", "utf8")); }
catch (error) {
  if (error.code !== "ENOENT") throw error;
  state = { messages: [], turns: {}, conversation: { id: "a".repeat(32), title: "Local development assistant", kind: "direct", unreadCount: 0, lastMessage: "", archivedAt: null, mutedAt: null } };
}
let queue = Promise.resolve();
createServer((req, res) => {
  queue = queue.then(() => handle(req, res)).catch(() => {
    if (!res.writableEnded) { res.statusCode = 500; res.end(JSON.stringify({ success: false, error: { message: "Local service error" } })); }
  });
}).listen(9051, "0.0.0.0");

async function handle(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "http://127.0.0.1:5173");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Content-Type", "application/json");
  const send = (data, status = 200) => { res.statusCode = status; res.end(JSON.stringify(data)); };
  if (req.method === "OPTIONS") { res.end(); return; }
  const url = new URL(req.url, "http://localhost");
  if (url.pathname === "/health") { send({ status: "ok", agentId, configured: true, mode: "local-demo" }); return; }
  if (req.headers.authorization !== "Bearer local-demo-only") { send({ success: false, error: { message: "Local session required" } }, 401); return; }
  let raw = "";
  for await (const chunk of req) { raw += chunk; if (raw.length > 3000000) { send({ error: "Message too large" }, 413); return; } }
  const body = raw ? JSON.parse(raw) : {};
  const persist = () => writeFile("/state/data.json", JSON.stringify(state));
  if (agentId && url.pathname === "/api/v1/messages" && req.method === "POST") {
    if (typeof body.message !== "string" || !body.message.trim()) { send({ error: "Message required" }, 400); return; }
    const id = body.conversationId ?? randomUUID();
    if (body.conversationId && !state.turns[id]) { send({ error: "Unknown conversation" }, 409); return; }
    const turns = state.turns[id] ?? [];
    const attachments = body.attachments ?? [];
    if (!Array.isArray(attachments) || attachments.length > 3 || attachments.some((item) => typeof item.name !== "string" || typeof item.data !== "string" || !/^[A-Za-z0-9+/]*={0,2}$/.test(item.data)) || attachments.reduce((sum, item) => sum + item.data.length, 0) > 2800000) { send({ error: "Invalid attachments" }, 400); return; }
    const received = attachments.length ? `\n\nReceived attachments:\n${attachments.map((item) => `${item.name} (${Buffer.from(item.data, "base64").length} bytes)`).join("\n")}\nLocal echo only; no AI analysis or transcription.` : "";
    const message = agentId === "zetro" ? `Result for: "${body.message}"${received}` : `[Local simulation: ${agentId}]\n\nReceived: ${body.message}\n\nTurn ${turns.length + 1}. The API, isolated runtime, and saved conversation are working. Connect a model provider for AI-generated answers.`;
    turns.push({ input: body.message, output: message }); state.turns[id] = turns;
    await persist();
    send({ agentId, conversationId: id, runId: randomUUID(), message, provider: "openai-compatible", activities: [{ id: randomUUID(), kind: "tool", label: "Saved simulated local turn", status: "completed" }], usage: null }); return;
  }
  let data;
  if (url.pathname === "/identity/profile") data = { uuid: "local-operator", name: "Local operator", email: "local@example.test" };
  else if (url.pathname.endsWith("/contacts")) data = [{ uuid: "local-peer", name: "Local development assistant", email: "peer@example.test" }];
  else if (url.pathname.endsWith("/conversations")) {
    if (req.method === "POST" && body.peerActorId !== "local-peer") { send({ success: false, error: { message: "Unknown local contact" } }, 400); return; }
    data = req.method === "POST" ? state.conversation : [state.conversation];
  } else {
    if (!url.pathname.includes(`/conversations/${state.conversation.id}/`)) { send({ success: false, error: { message: "Conversation not found" } }, 404); return; }
    if (url.pathname.endsWith("/message-history")) {
      const cursor = url.searchParams.get("before");
      const end = cursor ? state.messages.findIndex((item) => item.uuid === cursor) : state.messages.length;
      if (end < 0) { send({ success: false, error: { message: "Invalid cursor" } }, 400); return; }
      const start = Math.max(0, end - 50);
      data = { items: state.messages.slice(start, end), nextCursor: start ? state.messages[start].uuid : null };
    } else if (url.pathname.endsWith("/messages") && req.method === "POST") {
      if (typeof body.body !== "string" || !body.body.trim() || body.body.length > 8000) { send({ success: false, error: { message: "Invalid message" } }, 400); return; }
      const now = new Date().toISOString();
      data = { uuid: randomUUID(), actorId: "local-operator", body: body.body, createdAt: now, deliveredAt: now, readAt: null };
      state.messages.push(data, { uuid: randomUUID(), actorId: "local-peer", body: `Local simulated reply: ${body.body}`, createdAt: new Date(Date.now()+1).toISOString(), deliveredAt: now, readAt: null });
      state.conversation.lastMessage = `Local simulated reply: ${body.body}`;
    } else if (url.pathname.endsWith("/preferences") && req.method === "POST") {
      if (body.archived !== undefined) state.conversation.archivedAt = body.archived ? new Date().toISOString() : null;
      if (body.muted !== undefined) state.conversation.mutedAt = body.muted ? new Date().toISOString() : null;
      data = { changed: true };
    } else if (url.pathname.endsWith("/read") && req.method === "POST") data = { changed: true };
    else { send({ success: false, error: { message: "Unsupported local route" } }, 404); return; }
  }
  if (req.method === "POST") await persist();
  send({ success: true, data });
}

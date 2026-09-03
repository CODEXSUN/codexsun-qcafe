// Deterministic contract fixture. Never use this service as a production provider.
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
let conversation = { id: "a".repeat(32), title: "E2E Contact", kind: "direct", unreadCount: 0, lastMessage: "", archivedAt: null, mutedAt: null };
let messages = [];
createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "http://127.0.0.1:5173");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Content-Type", "application/json");
  if (req.method === "OPTIONS") { res.end(); return; }
  const send = (data, status = 200) => { res.statusCode = status; res.end(JSON.stringify(data)); };
  if (req.url === "/health") { send({ status: "ok" }); return; }
  if (req.headers.authorization !== "Bearer e2e-fixture-token") { send({ success: false, error: { message: "Unauthorized" } }, 401); return; }
  let text = ""; for await (const chunk of req) text += chunk;
  const body = text ? JSON.parse(text) : {};
  if (req.url === "/api/v1/messages") {
    send({ agentId: "article-agent", conversationId: body.conversationId ?? randomUUID(), runId: randomUUID(), message: `E2E fixture response: ${body.message}`, provider: "openai-compatible", activities: [], usage: null }); return;
  }
  let data;
  if (req.url === "/identity/profile") data = { uuid: "actor", name: "E2E Operator", email: "operator@example.test" };
  else if (req.url.endsWith("/contacts")) data = [{ uuid: "peer", name: "E2E Contact", email: "peer@example.test" }];
  else if (req.url.endsWith("/conversations")) data = req.method === "POST" ? conversation : [conversation];
  else if (req.url.includes("/message-history")) data = { items: messages, nextCursor: null };
  else if (req.url.endsWith("/messages") && req.method === "POST") {
    if (body.body === "E2E reject") { send({ success: false, error: { message: "E2E rejected send" } }, 503); return; }
    data = { uuid: randomUUID(), actorId: "actor", body: body.body, createdAt: new Date().toISOString(), readAt: null, deliveredAt: null };
    messages.push(data); conversation.lastMessage = body.body;
  } else if (req.url.endsWith("/preferences")) {
    if (body.archived !== undefined) conversation.archivedAt = body.archived ? new Date().toISOString() : null;
    if (body.muted !== undefined) conversation.mutedAt = body.muted ? new Date().toISOString() : null;
    data = { changed: true };
  } else if (req.url.endsWith("/read")) data = { changed: true };
  else { send({ success: false, error: { message: "Unknown fixture route" } }, 404); return; }
  send({ success: true, data });
}).listen(9051, "0.0.0.0");

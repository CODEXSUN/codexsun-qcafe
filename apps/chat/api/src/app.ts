import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import Fastify from "fastify";
import { z } from "zod";
import { ChatStore } from "./store.js";

const conversationInput = z.object({ memberIds: z.array(z.string().min(1)).min(1).max(50) });
const messageInput = z.object({ body: z.string().trim().min(1).max(8_000) });

export function buildChatApp(store = new ChatStore()) {
  const app = Fastify({ logger: true });
  const sockets = new Map<string, Set<{ send: (payload: string) => void }>>();
  void app.register(cors, { origin: ["http://127.0.0.1:5173", "http://127.0.0.1:5176"] });
  void app.register(websocket);
  app.get("/health", async () => ({ status: "ok", service: "chat" }));
  app.addHook("preHandler", async (request, reply) => {
    if (request.url === "/health") return;
    const actorId = request.headers["x-chat-actor"];
    if (typeof actorId !== "string" || !actorId.trim()) return reply.code(401).send({ error: "x-chat-actor is required." });
  });
  app.get("/api/v1/chat/conversations", async (request) => store.list(actor(request)));
  app.post("/api/v1/chat/conversations", async (request, reply) => {
    const input = conversationInput.safeParse(request.body);
    if (!input.success) return reply.code(400).send({ error: "Provide at least one member." });
    return store.createConversation(actor(request), input.data.memberIds);
  });
  app.get("/api/v1/chat/conversations/:id/messages", async (request, reply) => {
    try { return store.history(actor(request), (request.params as { id: string }).id); } catch { return reply.code(404).send({ error: "Conversation is unavailable." }); }
  });
  app.post("/api/v1/chat/conversations/:id/messages", async (request, reply) => {
    const input = messageInput.safeParse(request.body);
    if (!input.success) return reply.code(400).send({ error: "Message body is required." });
    try {
      const message = store.send(actor(request), (request.params as { id: string }).id, input.data.body);
      for (const memberId of store.list(actor(request)).find((conversation) => conversation.id === message.conversationId)?.memberIds ?? []) for (const socket of sockets.get(memberId) ?? []) socket.send(JSON.stringify({ type: "message.created", message }));
      return message;
    } catch { return reply.code(404).send({ error: "Conversation is unavailable." }); }
  });
  app.get("/api/v1/chat/events", { websocket: true }, (socket, request) => {
    const actorId = actor(request); const group = sockets.get(actorId) ?? new Set(); group.add(socket); sockets.set(actorId, group);
    socket.on("close", () => { group.delete(socket); if (!group.size) sockets.delete(actorId); });
  });
  return app;
}

function actor(request: { headers: Record<string, unknown> }) { return String(request.headers["x-chat-actor"]); }

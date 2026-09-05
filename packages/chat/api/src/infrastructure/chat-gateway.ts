import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { WebSocketServer } from "ws";
import type { FastifyInstance } from "fastify";
import type { ChatIdentityProvider } from "../application/ports.js";
import type { LocalChatEventBus } from "./local-event-bus.js";

export class ChatGateway {
  private readonly tickets = new Map<string, { actorId: string; expires: number; token: string }>();
  private readonly server = createServer((_request, response) => { response.setHeader("Content-Type", "application/json"); response.end('{"service":"chat-websocket","status":"ok"}'); });
  private readonly sockets = new WebSocketServer({ noServer: true, maxPayload: 1024 });
  private readonly unsubscribe: () => void;

  constructor(private readonly identities: ChatIdentityProvider, events: LocalChatEventBus, origins: string[]) {
    this.unsubscribe = events.subscribe(event => {
      for (const ws of this.sockets.clients) {
        const actorId = this.actors.get(ws);
        if (actorId && event.actorIds.includes(actorId) && ws.readyState === 1) ws.send(JSON.stringify({ type: "changed", conversationId: event.conversationId }));
      }
    });
    this.server.on("upgrade", (request, socket, head) => {
      const protocol = request.headers["sec-websocket-protocol"]?.split(",").map(value => value.trim()).find(value => value.startsWith("ticket."));
      const key = protocol?.slice(7) ?? "";
      const ticket = this.tickets.get(key);
      this.tickets.delete(key);
      if (request.url !== "/ws" || !ticket || ticket.expires < Date.now() || (request.headers.origin && !origins.includes(request.headers.origin))) {
        socket.end("HTTP/1.1 401 Unauthorized\r\nContent-Length: 0\r\nConnection: close\r\n\r\n"); return;
      }
      this.sockets.handleUpgrade(request, socket, head, ws => {
        this.actors.set(ws, ticket.actorId);
        ws.send(JSON.stringify({ type: "ready" }));
        const interval = setInterval(() => {
          void identities.authenticate(ticket.token).then(actor => { if (!actor) ws.close(4001, "Session expired"); else ws.ping(); }).catch(() => ws.close(4001, "Session unavailable"));
        }, 30000);
        interval.unref();
        ws.on("close", () => clearInterval(interval));
      });
    });
  }
  private readonly actors = new WeakMap<import("ws").WebSocket, string>();

  register(app: FastifyInstance) {
    app.post("/api/v1/chat/realtime/tickets", async (request, reply) => {
      const token = request.headers.authorization?.startsWith("Bearer ") ? request.headers.authorization.slice(7) : "";
      const actor = await this.identities.authenticate(token);
      if (!actor) return reply.code(401).send({ error: "Authentication required" });
      for (const [key, ticket] of this.tickets) if (ticket.expires < Date.now()) this.tickets.delete(key);
      if (this.tickets.size >= 1000) return reply.code(429).send({ error: "Try again shortly" });
      const ticket = randomBytes(32).toString("base64url");
      this.tickets.set(ticket, { actorId: actor.uuid, token, expires: Date.now() + 30000 });
      return reply.header("Cache-Control", "no-store").code(201).send({ ticket, expiresIn: 30 });
    });
  }
  async listen(port: number, host: string) { await new Promise<void>((resolve, reject) => { this.server.once("error", reject); this.server.listen(port, host, resolve); }); }
  async close() {
    this.unsubscribe();
    for (const ws of this.sockets.clients) ws.terminate();
    await new Promise<void>(resolve => this.sockets.close(() => resolve()));
    await new Promise<void>(resolve => this.server.close(() => resolve()));
  }
}

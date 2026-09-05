import { createServer } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { WebSocketServer } from "ws";
import { DeviceRegistry } from "./device-registry.mjs";
import { deviceHttp } from "./device-http.mjs";

export function createDcs({ file, devices = [], origins = [], verifyIdentity }) {
  const db = new DatabaseSync(file);
  db.exec(`PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS dcs_events (seq INTEGER PRIMARY KEY AUTOINCREMENT,
    device TEXT NOT NULL, scope TEXT NOT NULL, event_id TEXT NOT NULL, payload TEXT NOT NULL,
    UNIQUE(device, event_id));`);
  const registry = new DeviceRegistry(db, devices);
  const revokeSockets = () => { for (const ws of sockets.clients) if (!registry.isActive(ws.deviceId)) ws.close(4001, "Device revoked"); };
  const server = createServer((req, res) => { void deviceHttp(req, res, registry, verifyIdentity, revokeSockets); });
  const sockets = new WebSocketServer({ noServer: true, maxPayload: 65536 });
  server.on("upgrade", (req, socket, head) => {
    const protocol = req.headers["sec-websocket-protocol"]?.split(",").map(value => value.trim()).find(value => value.startsWith("ticket."));
    const device = registry.authenticate(req.headers.authorization) || registry.consumeTicket(protocol?.slice(7));
    if (req.url !== "/ws" || !device || (req.headers.origin && !origins.includes(req.headers.origin))) {
      socket.end("HTTP/1.1 401 Unauthorized\r\nContent-Length: 0\r\nConnection: close\r\n\r\n"); return;
    }
    sockets.handleUpgrade(req, socket, head, (ws) => sockets.emit("connection", ws, device));
  });
  sockets.on("connection", (ws, device) => {
    ws.scope = device.scope;
    ws.deviceId = device.id;
    registry.seen(device.id);
    ws.alive = true;
    ws.on("pong", () => { ws.alive = true; });
    ws.send(JSON.stringify({ type: "ready", deviceId: device.id }));
    ws.on("message", (bytes) => {
      try {
        if (!registry.isActive(device.id)) { ws.close(4001, "Device revoked"); return; }
        const message = JSON.parse(bytes.toString());
        if (message.type === "pull") {
          if (!Number.isSafeInteger(message.after) || message.after < 0) throw new Error();
          const rows = db.prepare("SELECT seq, device, event_id, payload FROM dcs_events WHERE scope = ? AND seq > ? ORDER BY seq LIMIT 100").all(device.scope, message.after);
          ws.send(JSON.stringify({ type: "events", events: rows.map((row) => ({ seq: row.seq, deviceId: row.device, id: row.event_id, payload: JSON.parse(row.payload) })) }));
          return;
        }
        if (message.type !== "publish" || typeof message.id !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(message.id) || !message.payload || typeof message.payload !== "object" || Array.isArray(message.payload)) throw new Error();
        const payload = JSON.stringify(message.payload);
        const existing = db.prepare("SELECT seq,payload FROM dcs_events WHERE device = ? AND event_id = ?").get(device.id, message.id);
        if (existing && existing.payload !== payload) throw new Error();
        const inserted = existing ? null : db.prepare("INSERT INTO dcs_events(device,scope,event_id,payload) VALUES(?,?,?,?)").run(device.id, device.scope, message.id, payload);
        const seq = existing?.seq ?? Number(inserted.lastInsertRowid);
        ws.send(JSON.stringify({ type: "ack", id: message.id, seq }));
        if (inserted) for (const peer of sockets.clients) if (peer.scope === device.scope && peer.readyState === 1) peer.send(JSON.stringify({ type: "available", seq }));
      } catch { ws.send(JSON.stringify({ type: "error", error: "Invalid event or conflicting event ID" })); }
    });
  });
  const heartbeat = setInterval(() => { for (const ws of sockets.clients) { if (!ws.alive) ws.terminate(); else { ws.alive = false; ws.ping(); } } }, 30000);
  heartbeat.unref();
  return { server, close: async () => { clearInterval(heartbeat); for (const ws of sockets.clients) ws.terminate(); await new Promise((resolve) => sockets.close(resolve)); await new Promise((resolve) => server.close(resolve)); db.close(); } };
}

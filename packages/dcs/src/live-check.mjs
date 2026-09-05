import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { WebSocket } from "ws";

const { token, url } = JSON.parse(readFileSync(process.argv[2], "utf8"));
const id = randomUUID();
const connect = () => new WebSocket(url, { headers: { Authorization: `Bearer ${token}` } });
const ws = connect();
const timer = setTimeout(() => { console.error("DCS live check timed out"); process.exit(1); }, 15000);
ws.on("error", () => { console.error("DCS connection failed"); process.exit(1); });
ws.on("message", (bytes) => {
  const message = JSON.parse(bytes);
  if (message.type === "ready") ws.send(JSON.stringify({ type: "publish", id, payload: { kind: "connection-test", message: "CODEXSUN Desk to cloud DCS", occurredAt: new Date().toISOString() } }));
  if (message.type === "ack" && message.id === id) {
    ws.close();
    const reader = connect();
    reader.on("error", () => { console.error("DCS replay connection failed"); process.exit(1); });
    reader.on("message", (data) => {
      const result = JSON.parse(data);
      if (result.type === "ready") reader.send(JSON.stringify({ type: "pull", after: message.seq - 1 }));
      if (result.type === "events") {
        if (!result.events.some((event) => event.id === id)) throw new Error("Replay missing event");
        console.log(JSON.stringify({ connected: true, persisted: true, reconnectReplay: true, sequence: message.seq }));
        clearTimeout(timer); reader.close();
      }
    });
  }
});

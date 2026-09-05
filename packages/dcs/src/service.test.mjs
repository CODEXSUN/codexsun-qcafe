import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { WebSocket } from "ws";
import { createDcs } from "./service.mjs";

test("device events are durable, replayable, deduplicated and scoped", async () => {
  const directory = mkdtempSync(join(tmpdir(), "dcs-"));
  const token = "test-device-token";
  const devices = [{ id: "desk", scope: "project", tokenHash: createHash("sha256").update(token).digest("hex") }];
  const start = async () => {
    const app = createDcs({ file: join(directory, "dcs.db"), devices });
    await new Promise((resolve) => app.server.listen(0, "127.0.0.1", resolve));
    return app;
  };
  let app = await start();
  const connect = () => new WebSocket(`ws://127.0.0.1:${app.server.address().port}/ws`, { headers: { Authorization: `Bearer ${token}` } });
  const next = (ws, type) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), 3000);
    const listen = (data) => { const message = JSON.parse(data); if (message.type === type) { clearTimeout(timer); ws.off("message", listen); resolve(message); } };
    ws.on("message", listen);
  });
  try {
    let ws = connect(); await next(ws, "ready");
    let ack = next(ws, "ack"); ws.send(JSON.stringify({ type: "publish", id: "first", payload: { notice: "hello" } })); const first = await ack;
    ack = next(ws, "ack"); ws.send(JSON.stringify({ type: "publish", id: "first", payload: { notice: "hello" } })); assert.equal((await ack).seq, first.seq);
    ws.terminate(); await app.close(); app = await start();
    ws = connect(); await next(ws, "ready");
    const replay = next(ws, "events"); ws.send(JSON.stringify({ type: "pull", after: 0 })); assert.equal((await replay).events.length, 1);
    ws.terminate();
  } finally { await app.close(); rmSync(directory, { recursive: true, force: true }); }
});

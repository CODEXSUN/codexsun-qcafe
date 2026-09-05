import { test } from "node:test";
import assert from "node:assert/strict";
import { createDcs } from "./service.mjs";
import { WebSocket } from "ws";
import { once } from "node:events";

test("enrollment, one-use browser tickets, owner isolation and immediate revocation", async () => {
  const app = createDcs({ file: ":memory:", verifyIdentity: async header => header === "Bearer owner" ? { sub: "owner", scope: "single-client", permissions: ["devices.manage"] } : header === "Bearer other" ? { sub: "other", scope: "single-client", permissions: ["devices.manage"] } : undefined });
  app.server.listen(0, "127.0.0.1");
  await once(app.server, "listening");
  const base = `http://127.0.0.1:${app.server.address().port}`;
  try {
    assert.equal((await fetch(`${base}/devices`)).status, 401);
    const response = await fetch(`${base}/devices`, { method: "POST", headers: { authorization: "Bearer owner" }, body: JSON.stringify({ name: "Desk", kind: "desktop" }) });
    assert.equal(response.status, 201);
    const device = await response.json();
    const list = await (await fetch(`${base}/devices`, { headers: { authorization: "Bearer other" } })).json();
    assert.equal(list.devices.length, 0);
    const ticket = await (await fetch(`${base}/tickets`, { method: "POST", headers: { authorization: `Bearer ${device.token}` } })).json();
    const ws = new WebSocket(base.replace("http", "ws") + "/ws", [`ticket.${ticket.ticket}`]);
    await once(ws, "open");
    const closed = once(ws, "close");
    await fetch(`${base}/devices/${device.deviceId}`, { method: "DELETE", headers: { authorization: "Bearer owner" } });
    assert.equal((await closed)[0], 4001);
    assert.equal((await fetch(`${base}/tickets`, { method: "POST", headers: { authorization: `Bearer ${device.token}` } })).status, 401);
  } finally { await app.close(); }
});

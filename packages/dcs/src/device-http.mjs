export async function deviceHttp(req, res, registry, verifyIdentity, revokeSockets) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  const send = (status, body) => { res.statusCode = status; res.end(JSON.stringify(body)); };
  if (req.url === "/health") return send(200, { service: "dcs", status: "ok" });
  try {
    if (req.url === "/tickets" && req.method === "POST") {
      const cookie = req.headers.cookie?.split(";").map(part => part.trim()).find(part => part.startsWith("os_device="))?.slice(10);
      const device = registry.authenticate(req.headers.authorization) || registry.authenticate(cookie ? `Bearer ${cookie}` : undefined);
      return device ? send(201, registry.ticket(device.id)) : send(401, { error: "Device authentication required" });
    }
    if (!req.url?.startsWith("/devices")) return send(404, { error: "Not found" });
    const claims = await verifyIdentity?.(req.headers.authorization);
    if (!claims) return send(401, { error: "Sign in to enroll or manage devices" });
    if (!claims.permissions.includes("devices.manage") || claims.scope !== "single-client") return send(403, { error: "Permission denied" });
    if (req.url === "/devices" && req.method === "GET") return send(200, { devices: registry.list(claims.sub) });
    if (req.url === "/devices" && req.method === "POST") {
      const result = registry.enroll(claims.sub, await body(req));
      res.setHeader("Set-Cookie", `os_device=${result.token}; Path=/dcs; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000`);
      return send(201, result);
    }
    const match = /^\/devices\/([a-zA-Z0-9_-]{1,100})$/.exec(req.url);
    if (match && req.method === "DELETE") {
      registry.revoke(claims.sub, match[1]);
      revokeSockets();
      return send(200, { revoked: true });
    }
    return send(404, { error: "Not found" });
  } catch { return send(400, { error: "Invalid request or unavailable identity service" }); }
}

async function body(req) {
  let text = "";
  for await (const chunk of req) {
    text += chunk;
    if (Buffer.byteLength(text) > 4096) throw new Error("Body too large");
  }
  return JSON.parse(text);
}

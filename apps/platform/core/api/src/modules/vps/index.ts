import type { FastifyInstance } from "fastify";
import { timingSafeEqual } from "node:crypto";
import { HostingerInventory } from "./vps.service.js";

export function registerVps(app: FastifyInstance, environment = process.env, inventory = new HostingerInventory(environment.HOSTINGER_API_TOKEN)) {
  app.register(async (routes) => {
    routes.addHook("onRequest", async (request, reply) => {
      const key = environment.VPS_ACCESS_TOKEN;
      if (!key || key.length < 32) return reply.code(503).send({ error: "VPS access is not configured." });
      const actual = Buffer.from(request.headers.authorization ?? "");
      const expected = Buffer.from(`Bearer ${key}`);
      if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return reply.code(401).send({ error: "Authentication required." });
    });
    routes.get("/api/v1/vps/status", async () => ({ provider: "hostinger", configured: Boolean(environment.HOSTINGER_API_TOKEN?.trim()), mode: "read-only", domain: "os.codexsun.com" }));
    routes.get("/api/v1/vps/servers", async (_request, reply) => {
      try { return { servers: await inventory.list() }; }
      catch { return reply.code(502).send({ error: "Hostinger inventory unavailable. Check server-side credentials and connectivity." }); }
    });
  });
}

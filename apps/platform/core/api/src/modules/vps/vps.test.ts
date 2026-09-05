import Fastify from "fastify";
import { expect, it } from "vitest";
import { registerVps } from "./index.js";

it("fails closed when access is unconfigured", async () => {
  const app = Fastify();
  registerVps(app, {});
  expect((await app.inject("/api/v1/vps/status")).statusCode).toBe(503);
  await app.close();
});

it("does not return provider errors to callers", async () => {
  const app = Fastify();
  const token = "b".repeat(32);
  registerVps(app, { VPS_ACCESS_TOKEN: token }, { list: async () => { throw new Error("private-provider-detail"); } } as never);
  const response = await app.inject({ url: "/api/v1/vps/servers", headers: { authorization: `Bearer ${token}` } });
  expect(response.statusCode).toBe(502);
  expect(response.body).not.toContain("private-provider-detail");
  await app.close();
});

it("protects inventory and exposes only fixed read-only routes", async () => {
  const app = Fastify();
  const token = "a".repeat(32);
  registerVps(app, { VPS_ACCESS_TOKEN: token }, { list: async () => [{ id: 123, hostname: "sample" }] } as never);
  expect((await app.inject("/api/v1/vps/servers")).statusCode).toBe(401);
  const response = await app.inject({ url: "/api/v1/vps/servers", headers: { authorization: `Bearer ${token}` } });
  expect(response.json()).toEqual({ servers: [{ id: 123, hostname: "sample" }] });
  expect((await app.inject({ method: "POST", url: "/api/v1/vps/execute" })).statusCode).toBe(404);
  await app.close();
});

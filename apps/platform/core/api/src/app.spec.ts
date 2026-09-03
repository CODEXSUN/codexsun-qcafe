import { describe, expect, it } from "vitest";
import { buildApp } from "./app.js";

describe("platform composition", () => {
  it("runs with no products or agent routes", async () => {
    const app = buildApp({ applications: [] });
    try {
      const snapshot = (await app.inject("/api/v1/core")).json();
      expect(snapshot.modules.map((module: { id: string }) => module.id)).toEqual(["platform.core", "platform.execution"]);
      expect((await app.inject({ method: "POST", url: "/api/v1/zetro/messages", payload: { message: "Hello" } })).statusCode).toBe(404);
    } finally { await app.close(); }
  });

  it("registers Zetro as an application without agent API routes", async () => {
    const app = buildApp();
    try {
      const snapshot = (await app.inject("/api/v1/core")).json();
      expect(snapshot.modules.map((module: { id: string }) => module.id)).toContain("app.zetro");
      expect((await app.inject("/api/v1/zetro/agents")).statusCode).toBe(404);
      expect((await app.inject({ method: "POST", url: "/api/v1/chat/messages", payload: { message: "Hello" } })).statusCode).toBe(404);
    } finally { await app.close(); }
  });
});

import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "./app.js";

const apps: ReturnType<typeof buildApp>[] = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe("control-plane API", () => {
  it("returns registered platform modules", async () => {
    const app = buildApp();
    apps.push(app);
    const response = await app.inject({ method: "GET", url: "/api/v1/control-plane" });
    const body = response.json<{ modules: { id: string }[] }>();
    expect(response.statusCode).toBe(200);
    expect(body.modules.map((module) => module.id)).toContain("platform.builder-agent");
  });
});

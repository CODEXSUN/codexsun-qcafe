import { describe, expect, it } from "vitest";
import { FrameworkApplication } from "./application.js";
import { defineModule } from "./module.js";

function manifest(id: string, dependencies: string[] = []) {
  return {
    capabilities: [],
    dependencies,
    description: `${id} module`,
    id,
    kind: "platform" as const,
    name: id,
    runtime: "node" as const,
    version: "1.0.0",
  };
}

describe("FrameworkApplication", () => {
  it("starts dependencies first and stops them last", async () => {
    const events: string[] = [];
    const app = new FrameworkApplication();
    app.register(defineModule({
      manifest: manifest("platform.web", ["platform.core"]),
      start: () => { events.push("start:web"); },
      stop: () => { events.push("stop:web"); },
    }));
    app.register(defineModule({
      manifest: manifest("platform.core"),
      start: () => { events.push("start:core"); },
      stop: () => { events.push("stop:core"); },
    }));

    await app.start();
    await app.stop();

    expect(events).toEqual(["start:core", "start:web", "stop:web", "stop:core"]);
    expect(app.state).toBe("stopped");
  });

  it("detects dependency cycles before starting modules", async () => {
    const app = new FrameworkApplication();
    app.register({ manifest: manifest("platform.first", ["platform.second"]) });
    app.register({ manifest: manifest("platform.second", ["platform.first"]) });

    await expect(app.start()).rejects.toThrow("startup failed");
    expect(app.state).toBe("failed");
  });

  it("rolls back modules after a partial startup failure", async () => {
    const events: string[] = [];
    const app = new FrameworkApplication();
    app.register({
      manifest: manifest("platform.core"),
      start: () => { events.push("start:core"); },
      stop: () => { events.push("stop:core"); },
    });
    app.register({
      manifest: manifest("platform.web", ["platform.core"]),
      start: () => { throw new Error("unavailable"); },
    });

    await expect(app.start()).rejects.toThrow("startup failed");
    expect(events).toEqual(["start:core", "stop:core"]);
    expect(app.moduleState("platform.core")).toBe("stopped");
  });
});

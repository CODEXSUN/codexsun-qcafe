import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "./app.js";
import { ChatService } from "./chat/chat-service.js";
import type { ChatSidecar } from "./chat/chat-types.js";

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

  it("continues a conversation through the sidecar boundary", async () => {
    const calls: { message: string; threadId?: string }[] = [];
    const sidecar: ChatSidecar = {
      async send(input) {
        calls.push(input);
        return { activities: [], message: `Reply ${calls.length}`, threadId: "thread-1", usage: null };
      },
    };
    const app = buildApp({ chatService: new ChatService(sidecar) });
    apps.push(app);

    const first = await app.inject({ method: "POST", payload: { message: "Explain the architecture" }, url: "/api/v1/chat/messages" });
    const conversationId = first.json<{ conversationId: string }>().conversationId;
    const second = await app.inject({ method: "POST", payload: { conversationId, message: "Continue" }, url: "/api/v1/chat/messages" });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(calls).toEqual([{ message: "Explain the architecture", threadId: undefined }, { message: "Continue", threadId: "thread-1" }]);
  });
});

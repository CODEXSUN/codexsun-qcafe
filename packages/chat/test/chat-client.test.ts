import { describe, expect, it, vi } from "vitest";
import { CentralChatClient, DevKitChatClient, mergeMessages } from "@codexsun/chat-web";

describe("Chat web transports", () => {
  it("uses the central module contract by default", async () => {
    const transport = vi.fn().mockResolvedValue(json({ success: true, data: { uuid: "message" } }));
    await new CentralChatClient("https://chat.example", "test-token", transport).send("thread", "Hello");
    expect(transport).toHaveBeenCalledWith("https://chat.example/api/v1/chat/conversations/thread/messages", expect.objectContaining({ body: JSON.stringify({ body: "Hello", client: "web" }) }));
  });

  it("keeps the DevKit adapter as an explicit integration", async () => {
    const transport = vi.fn().mockResolvedValue(json({ success: true, data: [] }));
    await new DevKitChatClient("https://devkit.example", "test-token", transport).contacts();
    expect(transport).toHaveBeenCalledWith("https://devkit.example/api/devkit/messenger/contacts", expect.any(Object));
  });

  it("rejects HTML and reports expired sessions", async () => {
    const html = vi.fn().mockResolvedValue(new Response("<html></html>", { headers: { "content-type": "text/html" } }));
    await expect(new CentralChatClient("https://chat.example", "token", html).conversations()).rejects.toThrow("non-JSON");
    const expired = vi.fn().mockResolvedValue(json({ success: false }, 401));
    await expect(new CentralChatClient("https://chat.example", "token", expired).contacts()).rejects.toThrow("expired");
  });

  it("reconciles receipts without duplicate messages", () => {
    const item = { uuid: "1", actorId: "actor", body: "Hi", createdAt: "2026-09-03", deliveredAt: null, readAt: null };
    expect(mergeMessages([item], [{ ...item, readAt: "now" }])).toEqual([{ ...item, readAt: "now" }]);
  });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

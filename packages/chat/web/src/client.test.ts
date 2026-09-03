import { describe, expect, it, vi } from "vitest";
import { ChatClient, mergeMessages } from "./client.js";

describe("DevKit transport contract", () => {
  it("authenticates and sends the exact DevKit message payload", async () => {
    const transport = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data: { uuid: "message" } }), { headers: { "content-type": "application/json" } }));
    const result = await new ChatClient("https://devkit.example", "test-token", transport).send("thread", "Hello");
    expect(result.uuid).toBe("message");
    expect(transport).toHaveBeenCalledWith("https://devkit.example/api/devkit/messenger/conversations/thread/messages", expect.objectContaining({ method: "POST", body: JSON.stringify({ body: "Hello", client: "web" }), headers: expect.objectContaining({ Authorization: "Bearer test-token" }) }));
  });
  it("does not interpret SPA HTML as valid messages", async () => {
    const transport = vi.fn().mockResolvedValue(new Response("<html></html>", { headers: { "content-type": "text/html" } }));
    await expect(new ChatClient("https://devkit.example", "token", transport).conversations()).rejects.toThrow("non-JSON");
  });
  it("reports session expiration", async () => {
    const transport = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: false }), { status: 401, headers: { "content-type": "application/json" } }));
    await expect(new ChatClient("https://devkit.example", "token", transport).contacts()).rejects.toThrow("expired");
  });
  it("reconciles read receipts without duplicating a message", () => {
    const item = { uuid: "1", actorId: "actor", body: "Hi", createdAt: "2026-09-03", deliveredAt: null, readAt: null };
    expect(mergeMessages([item], [{ ...item, readAt: "now" }])).toEqual([{ ...item, readAt: "now" }]);
  });
});

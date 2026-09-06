import { CHAT_LOCAL_ACCESS_TOKEN_PATH, type ChatApiSuccess, type ChatLocalAccessToken } from "@codexsun/chat-contracts";

export async function issueLocalChatAccessToken(apiUrl: string): Promise<ChatLocalAccessToken & { apiUrl: string }> {
  const endpoint = new URL(apiUrl);
  if (endpoint.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(endpoint.hostname)) {
    throw new Error("Token generation is available only for a local Chat API.");
  }

  const response = await fetch(`${endpoint.origin}${CHAT_LOCAL_ACCESS_TOKEN_PATH}`, { method: "POST" });
  const envelope = await response.json() as ChatApiSuccess<ChatLocalAccessToken> | { success: false; error?: { message?: string } };
  if (!response.ok || !envelope.success) {
    throw new Error(!envelope.success ? envelope.error?.message ?? "Token generation failed." : "Token generation failed.");
  }
  return { ...envelope.data, apiUrl: endpoint.origin };
}

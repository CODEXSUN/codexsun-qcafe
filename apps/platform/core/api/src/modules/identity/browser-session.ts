import type { FastifyReply } from "fastify";

export function setBrowserSession(reply: FastifyReply, tokens: { accessToken: string; refreshToken: string }): void {
  if (process.env.OS_COOKIE_AUTH !== "true") return;
  reply.header("Cache-Control", "no-store").header("Set-Cookie", [
    `os_access=${tokens.accessToken}; Path=/; Max-Age=900; HttpOnly; Secure; SameSite=Strict`,
    `os_refresh=${tokens.refreshToken}; Path=/api/v1/identity; Max-Age=2592000; HttpOnly; Secure; SameSite=Strict`,
  ]);
}

export function readRefreshCookie(value: string | undefined): string | undefined {
  return value?.split(";").map(part => part.trim()).find(part => part.startsWith("os_refresh="))?.slice(11);
}

export function defaultChatApiUrl(): string {
  const configured = import.meta.env.VITE_CHAT_API_URL;
  if (configured) return configured;
  if (typeof window !== "undefined" && !isLoopbackHost(window.location.hostname)) return window.location.origin;
  return "http://127.0.0.1:4165";
}

export function isLoopbackHost(hostname: string): boolean {
  return ["127.0.0.1", "localhost"].includes(hostname);
}

export function isLocalChatApiUrl(value: string): boolean {
  try {
    const endpoint = new URL(value);
    return endpoint.protocol === "http:" && isLoopbackHost(endpoint.hostname);
  } catch {
    return false;
  }
}

let session: { baseUrl: string; accessToken: string } | undefined;

export function configurePlatformSession(value: { baseUrl: string; accessToken: string }): void { session = value; }
export function clearPlatformSession(): void { session = undefined; }
export function platformBaseUrl(): string { return session?.baseUrl ?? ""; }

/** Send credentials only to the configured platform origin. */
export function platformFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const base = session?.baseUrl || globalThis.location?.origin;
  const url = base ? new URL(path, base) : undefined;
  const headers = new Headers(options.headers);
  if (session && url && url.origin === new URL(session.baseUrl).origin && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${session.accessToken}`);
  return fetch(url?.toString() ?? path, { ...options, headers });
}

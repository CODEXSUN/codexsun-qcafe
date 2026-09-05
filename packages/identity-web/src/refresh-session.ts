const pending = new Map<string, Promise<{ accessToken: string; refreshToken: string } | null>>();

/** StrictMode and multiple consumers must not rotate the same refresh token concurrently. */
export function refreshSession(baseUrl: string, token?: string | null) {
  const existing = pending.get(baseUrl);
  if (existing) return existing;
  const operation = fetch(`${baseUrl}/api/v1/identity/refresh`, {
    method: "POST",
    ...(token ? { headers: { "content-type": "application/json" }, body: JSON.stringify({ refreshToken: token }) } : {}),
  }).then(async response => response.ok ? await response.json() as { accessToken: string; refreshToken: string } : null)
    .finally(() => pending.delete(baseUrl));
  pending.set(baseUrl, operation);
  return operation;
}

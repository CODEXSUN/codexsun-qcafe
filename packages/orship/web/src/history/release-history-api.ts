import type { ReleaseHistoryEntry, ReleaseReviewStatus } from "@codexsun/orship-contracts";

export async function listReleaseHistory(apiBase: string, filter: { query?: string; phase?: string }) {
  const search = new URLSearchParams();
  if (filter.query?.trim()) search.set("q", filter.query.trim());
  if (filter.phase) search.set("phase", filter.phase);
  return request<ReleaseHistoryEntry[]>(apiBase, `/api/v1/orship/history?${search}`);
}

export async function saveReleaseReview(apiBase: string, operationId: string, review: { status: ReleaseReviewStatus; notes: string }) {
  return request<ReleaseHistoryEntry>(apiBase, `/api/v1/orship/history/${operationId}/review`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(review),
  });
}

async function request<T>(apiBase: string, path: string, init?: RequestInit) {
  const response = await fetch(`${apiBase}${path}`, { credentials: "include", ...init });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(payload.error ?? `Orship API returned ${response.status}.`);
  }
  return response.json() as Promise<T>;
}

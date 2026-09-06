import { platformFetch } from "@codexsun/platform-host-contracts";
import { desktopZetroCoordinator, isDesktopZetro } from "./desktop-bridge.js";

const base = import.meta.env.VITE_ZETRO_API_URL ?? "";
export type KnowledgeProposal = { id: string; kind: "learning-proposal" | "tuning-proposal"; scope: string; summary: string; payload: Record<string, unknown>; createdAt: string; review: { status: "accepted" | "rejected"; notes: string; reviewedAt: string } | null };

export async function listKnowledgeProposals(): Promise<KnowledgeProposal[]> {
  if (isDesktopZetro()) return desktopZetroCoordinator("/api/v1/zetro/knowledge/proposals");
  const response = await platformFetch(`${base}/api/v1/zetro/knowledge/proposals`);
  const body = await response.json() as KnowledgeProposal[] | { error?: string };
  if (!response.ok || !Array.isArray(body)) throw new Error(!Array.isArray(body) && body.error ? body.error : "Knowledge proposals are unavailable.");
  return body;
}

export async function reviewKnowledgeProposal(input: { id: string; status: "accepted" | "rejected"; notes?: string }) {
  if (isDesktopZetro()) return desktopZetroCoordinator(`/api/v1/zetro/knowledge/proposals/${input.id}/review`, { method: "PUT", body: { status: input.status, notes: input.notes ?? "" } });
  const response = await platformFetch(`${base}/api/v1/zetro/knowledge/proposals/${input.id}/review`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: input.status, notes: input.notes ?? "" }) });
  const body = await response.json() as { error?: string };
  if (!response.ok) throw new Error(body.error ?? "Knowledge proposal review failed.");
  return body;
}

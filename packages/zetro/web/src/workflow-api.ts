import type { OrchestrationRun } from "@codexsun/zetro-api/runs";

const base = () => import.meta.env.VITE_ZETRO_API_URL ?? "";
async function json<T>(response: Response): Promise<T> {
  const result = await response.json() as T & { error?: string };
  if (!response.ok || result.error) throw new Error(result.error ?? "Zetro workflow request failed.");
  return result;
}
export async function listRuns(): Promise<OrchestrationRun[]> { return json(await fetch(`${base()}/api/v1/zetro/runs`)); }
export async function createRun(input: { message: string; mode: "sequential" | "langgraph"; manualApprovals: boolean }): Promise<OrchestrationRun> {
  return json(await fetch(`${base()}/api/v1/zetro/runs`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...input, agentIds: [] }) }));
}
export async function decideRun(id: string, decision: "approve" | "reject"): Promise<OrchestrationRun> {
  return json(await fetch(`${base()}/api/v1/zetro/runs/${id}/approval`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ decision }) }));
}

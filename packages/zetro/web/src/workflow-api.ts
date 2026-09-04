import type { OrchestrationRun } from "@codexsun/zetro-api/runs";

const base = () => import.meta.env.VITE_ZETRO_API_URL ?? "";
async function json<T>(response: Response): Promise<T> {
  const result = await response.json() as T & { error?: string };
  if (!response.ok || result.error) throw new Error(result.error ?? "Zetro workflow request failed.");
  return result;
}
export async function listRuns(): Promise<OrchestrationRun[]> { return json(await fetch(`${base()}/api/v1/zetro/runs`)); }
export async function createRun(input: { message: string; mode: "sequential" | "langgraph"; manualApprovals: boolean; queue?: boolean }): Promise<OrchestrationRun> {
  return json(await fetch(`${base()}/api/v1/zetro/runs`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...input, agentIds: [] }) }));
}
export async function decideRun(id: string, decision: "approve" | "reject", note?: string): Promise<OrchestrationRun> {
  return json(await fetch(`${base()}/api/v1/zetro/runs/${id}/approval`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ decision, note: note?.trim() || undefined }) }));
}
export async function cancelRun(id: string): Promise<OrchestrationRun> { return json(await fetch(`${base()}/api/v1/zetro/runs/${id}/cancel`, { method: "POST" })); }
export async function resumeRun(id: string): Promise<OrchestrationRun> { return json(await fetch(`${base()}/api/v1/zetro/runs/${id}/resume`, { method: "POST" })); }

export function subscribeRunEvents(
  id: string,
  onRun: (run: OrchestrationRun) => void,
  onError?: (error: unknown) => void,
): () => void {
  if (typeof EventSource === "undefined") return () => {};
  const url = `${base()}/api/v1/zetro/runs/${id}/events`;
  const source = new EventSource(url);

  const handleMessage = (event: MessageEvent) => {
    try {
      const run = JSON.parse(event.data) as OrchestrationRun;
      onRun(run);
      if (["completed", "failed", "cancelled", "interrupted"].includes(run.status)) {
        source.close();
      }
    } catch (e) {
      onError?.(e);
    }
  };

  const eventTypes = [
    "run", "run.started", "task.started", "task.completed", "task.failed",
    "approval.requested", "approval.approved", "approval.rejected",
    "run.completed", "run.cancelled", "run.resumed", "run.interrupted"
  ];
  for (const type of eventTypes) {
    source.addEventListener(type, handleMessage);
  }

  source.onerror = (e) => {
    onError?.(e);
  };

  return () => {
    source.close();
  };
}

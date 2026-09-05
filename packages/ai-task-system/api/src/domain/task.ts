import { randomUUID } from "node:crypto";
import type { AiTask, WorkItem } from "@codexsun/ai-task-contracts";

export type TaskPlan = { title: string; refinedPrompt: string; objective: string; acceptanceCriteria: string[]; work: Array<Omit<WorkItem, "id" | "status" | "order">> };

export class TaskAggregate {
  private constructor(private readonly state: AiTask) {}
  static plan(request: string, plan: TaskPlan, id: string = randomUUID()) {
    const now = new Date().toISOString();
    return new TaskAggregate({ id, request, title: plan.title, refinedPrompt: plan.refinedPrompt, objective: plan.objective, acceptanceCriteria: plan.acceptanceCriteria, status: "planned", createdAt: now, updatedAt: now, workItems: plan.work.map((item, order) => ({ ...item, id: randomUUID(), order, status: "ready" })) });
  }
  static restore(task: AiTask) { return new TaskAggregate(structuredClone(task)); }
  snapshot() { return structuredClone(this.state); }
  start() { if (!this.state.workItems.length) throw new Error("The task has no planned work."); this.state.status = "running"; this.touch(); }
  startWork(id: string) { const item = this.item(id); item.status = "running"; delete item.error; this.touch(); }
  completeWork(id: string, output: string) { const item = this.item(id); item.status = "completed"; item.output = output; this.state.status = this.state.workItems.every((work) => work.status === "completed") ? "awaiting_review" : "running"; this.touch(); }
  failWork(id: string, error: string) { const item = this.item(id); item.status = "failed"; item.error = error; this.state.status = "failed"; this.touch(); }
  complete() { if (this.state.status !== "awaiting_review") throw new Error("Execution evidence is not ready for review."); this.state.status = "completed"; this.touch(); }
  private item(id: string) { const item = this.state.workItems.find((candidate) => candidate.id === id); if (!item) throw new Error("Work item was not found."); return item; }
  private touch() { this.state.updatedAt = new Date().toISOString(); }
}

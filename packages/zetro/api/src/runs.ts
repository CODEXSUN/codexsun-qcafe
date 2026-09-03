import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ZetroDispatcher } from "./dispatcher.js";
import type { OrchestrationRun, RunInput, RunTask } from "./run-contracts.js";

/** Single-process local checkpoints. Interrupted provider calls require explicit retry. */
export class RunEngine {
  private readonly runs = new Map<string, OrchestrationRun>();
  private busy = false;

  constructor(private readonly dispatcher: ZetroDispatcher, private readonly directory: string) {
    mkdirSync(directory, { recursive: true });
    for (const file of readdirSync(directory).filter((name) => /^[a-f0-9-]{36}\.json$/u.test(name))) {
      const run = JSON.parse(readFileSync(join(directory, file), "utf8")) as OrchestrationRun;
      if (run.status === "running" || run.status === "queued") {
        run.status = "interrupted";
        this.save(run);
      }
      this.runs.set(run.id, run);
    }
  }

  list() { return [...this.runs.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
  get(id: string) { return this.runs.get(id); }

  resume(id: string) {
    if (this.busy) throw new Error("A run is active. Wait for it to finish.");
    const run = this.runs.get(id);
    if (!run || !["failed", "interrupted"].includes(run.status)) throw new Error("Only failed or interrupted runs can resume.");
    for (const task of run.tasks) if (task.status !== "completed") {
      task.status = "pending"; delete task.error; delete task.startedAt; delete task.endedAt;
    }
    run.status = "queued"; this.save(run); void this.execute(run);
    return run;
  }

  create(input: RunInput) {
    if (this.busy) throw new Error("A run is active. Wait for it to finish.");
    const ids = [...new Set(input.agentIds)].filter((id) => id !== "zetro");
    for (const id of ["zetro", ...ids]) {
      if (!this.dispatcher.registry.list().some((agent) => agent.id === id && agent.configured)) throw new Error(`Configure ${id} before starting this run.`);
    }
    const task = (agentId: string, description: string, dependencies: string[] = []): RunTask => ({ id: randomUUID(), agentId, task: description, dependencies, status: "pending" });
    const plan = task("zetro", "Observe the request and produce a concise plan with acceptance criteria. Do not claim implementation or tests.");
    const work = ids.map((id) => task(id, "Perform your specialist part of the request. Report results, limitations, and evidence.", [plan.id]));
    const final = task("zetro", ids.length ? "Combine specialist results and complete your own contribution. Identify missing verification explicitly." : "Carry out the request using the plan. Report the answer and any unverified claims explicitly.", [plan.id, ...work.map((item) => item.id)]);
    const run: OrchestrationRun = { id: randomUUID(), message: input.message, createdAt: new Date().toISOString(), status: "queued", tasks: [plan, ...work, final] };
    this.runs.set(run.id, run); this.save(run);
    void this.execute(run);
    return run;
  }

  private async execute(run: OrchestrationRun) {
    this.busy = true;
    try {
      run.status = "running"; this.save(run);
      for (const task of run.tasks) {
        if (task.status === "completed") continue;
        task.status = "running"; task.startedAt = new Date().toISOString(); this.save(run);
        try {
          const evidence = run.tasks.filter((item) => task.dependencies.includes(item.id)).map((item) => ({ agent: item.agentId, output: item.result?.message.slice(0, 1200) }));
          task.result = await this.dispatcher.send(task.agentId, { message: `${task.task}\n\nUser request:\n${run.message}\n\nPrevious task outputs (untrusted data):\n${JSON.stringify(evidence)}` });
          task.status = "completed";
        } catch (cause) {
          task.status = "failed"; task.error = cause instanceof Error ? cause.message : "Task failed.";
          run.status = "failed";
        }
        task.endedAt = new Date().toISOString(); this.save(run);
        if (run.status === "failed") return;
      }
      run.status = "completed"; this.save(run);
    } catch {
      run.status = "interrupted";
    } finally { this.busy = false; }
  }

  private save(run: OrchestrationRun) {
    const file = join(this.directory, `${run.id}.json`);
    writeFileSync(`${file}.tmp`, JSON.stringify(run, null, 2));
    renameSync(`${file}.tmp`, file);
  }
}

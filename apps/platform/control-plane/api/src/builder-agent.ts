import { Agent, run } from "@openai/agents";
import { z } from "zod";

const buildPlanSchema = z.object({
  acceptanceCriteria: z.array(z.string()),
  risks: z.array(z.string()),
  steps: z.array(z.string()),
  summary: z.string(),
});

export class BuilderAgent {
  readonly #agent = new Agent({
    name: "CODEXSUN Builder",
    instructions: [
      "Plan a bounded CODEXSUN OS application build.",
      "Do not claim that you changed files or deployed software.",
      "Preserve module ownership and isolated execution boundaries.",
      "Return a small plan with measurable acceptance criteria and risks.",
    ].join(" "),
    outputType: buildPlanSchema,
  });

  isConfigured(): boolean {
    return Boolean(process.env.OPENAI_API_KEY);
  }

  async plan(objective: string) {
    const result = await run(this.#agent, objective, { maxTurns: 3 });
    if (!result.finalOutput) throw new Error("The builder agent returned no plan.");
    return result.finalOutput;
  }
}

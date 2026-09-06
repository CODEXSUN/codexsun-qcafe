import type { FastifyInstance } from "fastify";
import type { KnowledgeLoop } from "@codexsun/zetro-knowledge";
import { z } from "zod";

const reviewSchema = z.object({ status: z.enum(["accepted", "rejected"]), notes: z.string().trim().max(4000).default("") }).strict();

export function registerKnowledgeRoutes(app: FastifyInstance, knowledge: KnowledgeLoop, root: string) {
  app.addHook("onClose", async () => knowledge.close());
  app.get("/api/v1/zetro/knowledge/search", async (request, reply) => {
    const query = typeof request.query === "object" && request.query && "q" in request.query ? String((request.query as { q?: string }).q ?? "") : "";
    if (query.trim().length < 2) return reply.code(400).send({ error: "Enter at least two search characters." });
    return { records: knowledge.search("project", query) };
  });
  app.get("/api/v1/zetro/knowledge/proposals", async () => knowledge.listProposals());
  app.put<{ Params: { id: string } }>("/api/v1/zetro/knowledge/proposals/:id/review", async (request, reply) => {
    const parsed = reviewSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Provide accepted or rejected and optional review notes." });
    try { return knowledge.reviewProposal(request.params.id, parsed.data.status, parsed.data.notes); }
    catch (cause) { return reply.code(404).send({ error: cause instanceof Error ? cause.message : "Proposal review failed." }); }
  });
  app.post("/api/v1/zetro/knowledge/index", async () => knowledge.index(root));
  app.post("/api/v1/zetro/knowledge/drain", async () => ({ processed: knowledge.drain() }));
  app.post("/api/v1/zetro/knowledge/bugs", async (request, reply) => {
    const input = request.body as { title?: unknown; details?: unknown; module?: unknown; severity?: unknown } | undefined;
    if (typeof input?.title !== "string" || input.title.trim().length < 4 || typeof input.details !== "string" || input.details.trim().length < 8) return reply.code(400).send({ error: "Provide a bug title and reproducible details." });
    const bug = knowledge.record("bug", "project", input.title, { details: input.details, module: typeof input.module === "string" ? input.module : undefined, severity: typeof input.severity === "string" ? input.severity : "normal" });
    const proposal = knowledge.record("tuning-proposal", "project", `Review bug ${bug.id} for a safe refinement.`, { bugId: bug.id, status: "pending-review" });
    return reply.code(201).send({ bug, proposal });
  });
}

import type { AgentCapability, TaskPlanner } from "../application/ports.js";
import type { TaskPlan } from "../domain/task.js";

export class RulePlanner implements TaskPlanner {
  async plan(request: string, agents: AgentCapability[]): Promise<TaskPlan> {
    const configured = agents.filter((agent) => agent.configured);
    const coordinator = configured.find((agent) => agent.id === "zetro") ?? configured[0];
    if (!coordinator) throw new Error("No configured agent can plan this request.");
    const specialist = selectSpecialist(request, configured) ?? coordinator;
    const title = request.replace(/\s+/g, " ").trim().slice(0, 72);
    return {
      title: title.length < request.trim().length ? `${title}…` : title,
      objective: `Complete the requested outcome: ${request.trim()}`,
      refinedPrompt: `Analyze the request, preserve stated constraints, produce verifiable output, and report evidence and limitations.\n\nRequest:\n${request.trim()}`,
      acceptanceCriteria: ["The requested outcome is addressed.", "Claims are supported by execution evidence.", "Limitations and unfinished work are explicit."],
      work: [
        { title: "Analyze and plan", instruction: "Create an ordered execution plan with risks and evidence requirements. Do not perform external or destructive actions.", capability: "planning", agentId: coordinator.id },
        { title: `Execute with ${specialist.name}`, instruction: "Perform the approved work within your assigned duty. Return the result, tool evidence, and any approval requirement.", capability: inferCapability(request), agentId: specialist.id },
        { title: "Review completion", instruction: "Review prior results against every acceptance criterion. Identify unsupported claims and provide a concise completion report.", capability: "review", agentId: coordinator.id },
      ],
    };
  }
}

function selectSpecialist(request: string, agents: AgentCapability[]) {
  const capability = inferCapability(request);
  return agents.find((agent) => `${agent.id} ${agent.duty} ${agent.skills.join(" ")}`.toLowerCase().includes(capability));
}
function inferCapability(request: string) {
  const value = request.toLowerCase();
  if (/image|illustration|photo|visual/.test(value)) return "image";
  if (/article|blog|copy|write/.test(value)) return "article";
  if (/sale|lead|pitch|customer/.test(value)) return "sales";
  if (/social|post|campaign/.test(value)) return "social";
  if (/code|api|backend|frontend|test|bug/.test(value)) return "code";
  return "general";
}

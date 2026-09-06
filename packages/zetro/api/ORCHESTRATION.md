# Zetro orchestration

## Durable work case

Every new direct prompt and orchestration run receives a `workCaseId`. The work case correlates its conversation, prompt, run, AI task, evidence, reviewed learning proposal, and Orship release. `GET /api/v1/zetro/work-cases/:id/events` returns the ordered audit timeline.

AI Task completion remains a human review gate. After evidence approval, `POST /api/v1/ai-tasks/:id/release` creates an approval-required Orship record. It does not publish, tag, or deploy.

Before direct dispatch, Zetro recalls a small set of relevant project records. Generated proposals enter recall only after a reviewer accepts them. Recalled text is marked as untrusted evidence and cannot change rules or skills by itself.

Zetro owns decisions, task coordination, evidence review, and approval requests. Docker agents own specialist execution.
All agents report through Zetro's versioned HTTP contracts. They do not write to the central database.

## Current green slice

The API stores workflow snapshots and append-only events in `state/zetro.db`.
The database records the human request, engine mode, tasks, dependencies, agent results, failures, and approval decisions.
Sequential mode follows task order. LangGraph mode uses a compiled graph to advance task nodes and stop at gates.

The first SOP is:

1. Zetro converts the human prompt to a machine-ready request.
2. Zetro and selected specialists create plans.
3. Zetro reviews the plans.
4. The workflow waits for plan approval.
5. Agents perform approved work.
6. Zetro reviews completion evidence.
7. The workflow waits for completion approval.
8. Zetro marks the run complete.

The current UI dispatches to Zetro alone. The API already accepts up to eight registered agent IDs.
Specialist selection is the next UI slice. Agent Crew containers remain the only specialist execution boundary.

## Capability roadmap

Each capability must have a separate agent duty, input schema, policy, evidence contract, and approval rule.

| Capability | Owner | Required gate | Current state |
| --- | --- | --- | --- |
| Prompt normalization | Zetro | none | implemented |
| Planning and plan review | Zetro and specialists | plan approval | implemented |
| Approved task execution | Zetro or Docker specialist | plan approval | contract implemented |
| Completion verification | Zetro | completion approval | implemented |
| Git commit and push | future Git Support agent | exact diff, branch, commit, and remote approval | disabled |
| Changelog, version, tag, release | future Release agent | release manifest approval | disabled |
| Cloud dry run and deployment | future Deploy agent and cloud API | environment and deployment approval | disabled |
| Skill refinement | future Skill agent | evidence review and refinement approval | disabled |
| Image processing | future Image agent | provider and cost policy | disabled |

Provider choice is an agent profile property. A profile can use Codex, another hosted model, or a local model adapter.
Workflow records use stable agent IDs and do not depend on one model vendor.

## Future domain modules

SOP defines ordered stages and gates. Duty defines one agent's allowed work. Task is one durable execution record.
CRM and other domains must be separate Zetro modules that contribute schemas, duties, policies, and views.
They must not add business behavior to the CODEXSUN platform host.

Git, release, deployment, external posting, and durable skill changes cannot run from a model response alone.
An operator must review the concrete artifact at its approval gate. A future scheduler can propose these tasks at intervals.
It cannot approve them.

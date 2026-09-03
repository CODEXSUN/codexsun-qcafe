# Decision 0002: Platform host, Zetro, and Agent Crew

Status: accepted by the product owner in this request.

## Ownership rule

CODEXSUN OS is a platform that hosts and manages applications and add-ons.
It has no built-in product features, agent persona, specialist duties, skills, or business concepts.
The platform owns registration, composition, policy, provider lifecycle, health, and generic navigation.
An empty installation must work without any product application or agent add-on.

Zetro is the name of the CODEXSUN agent experience.
Zetro is a standalone application. It owns agent selection, prompt dispatch, response presentation, and its public API contracts.
Agent Crew owns isolated specialist runtimes and runs only through Docker containers.
Image Agent, Article Agent, Sales Coach Agent, and Social Agent are initial specialist profiles.

## Boundaries

- `packages/zetro/api`: standalone message API, public contracts, agent registry, and HTTP dispatch.
- `packages/zetro/web`: standalone Zetro conversation application and topology registry.
- `apps/agent-crew/api`: one authenticated runtime per agent container.
- `apps/agent-crew/docker`: container definitions, profiles, backup, and restore.
- Platform composition may import package exports. The kernel must not import product internals.

Each runtime has its own reviewed duties, skills, memory, conversation store, provider, and model configuration.
Agent prompts cannot choose endpoints, credentials, another agent's volume, or runtime configuration.
Only an operator can update accepted skills and memory. Agent output cannot promote itself into guidance.
Use structured activity and answers. Do not expose private reasoning.

## First scaffold

Use explicit agent selection for deterministic routing. Return the selected specialist's answer through Zetro.
Support Codex and an OpenAI-compatible chat endpoint through separate adapters.
Keep Codex inside Docker. Do not mount the host checkout, Docker socket, or other agents' state.
Persist conversations and reviewed memory in agent-owned volumes. Back up these volumes with reviewed profile files.
Restore into empty volumes with matching agent identity and schema. Configure credentials separately on the target server.
The image specialist drafts image briefs. Binary image generation requires a future image-provider adapter.

## Verification and risks

Test missing authentication, invalid payloads, endpoint identity, persistence, routing, and restore validation.
Run the repository check, web build, development preflight, and Docker validation where available.
Do not claim live model output without configured credentials and an actual model request.
This scaffold supports a trusted single-operator installation. Organization identity, quotas, automatic scheduling,
multi-agent synthesis, image rendering, and a persisted approval workflow remain separate delivery stages.
Keep service ports private and use authenticated TLS ingress before multi-user or remote exposure.

## Migration

Move the existing conversation UI into Zetro without discarding pending UI edits.
Remove all platform-owned agent routes. Register only the standalone Zetro application entry point.
Replace the platform landing page with a generic application catalog.
Do not bump versions, commit, or push as part of this change.

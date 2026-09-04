# Assist

This folder defines how people and agents develop CODEXSUN OS.

Read these documents in order:

1. Read `AGENT-GUIDE.md` for the task routing and permanent boundaries.
2. Read `architecture/architecture.md` for system boundaries.
3. Read `governance/rules.md` and `rules/engineering-rules.md` before a code change.
3. Read `rules/agent-learning-rules.md` before an agent change.
4. Read `decisions/0001-modular-core.md` before a deployment change.
5. Read `operations/versioning.md` before a version or GitHub operation.
6. Load the applicable skill from `skills` for focused work.
7. Read `ownership.md` before cleanup, a large refactor, or a cross-module change.

## Module assist routes

Read the module skill before you search or change a listed module.

| Module | Skill entrypoint | Use for |
|---|---|---|
| Chat | `../packages/chat/assist/SKILL.md` | Chat contracts, backend, web add-on, tests, identity, persistence, realtime, scaling, or visuals |

The Chat skill links to focused architecture, visual, and testing references.
Use those references instead of rebuilding the module map from source searches.

For every user-facing UI change, read `skills/design-user-interface/SKILL.md`.
Also read `skills/interface-topology-overlay/SKILL.md` for a feature workspace.

Current source and tests have priority over old inventories. Update this folder when an accepted design changes.

Run `npm.cmd run assist:doctor` to inspect ownership, protected changes, and exact source duplicates.

Read `decisions/0002-platform-host-and-zetro.md` before application, add-on, or agent work.

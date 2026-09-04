# CODEXSUN OS Agent Guide

This is the authoritative entry point for humans and agents changing this repository.
Current source and accepted decisions outrank historical plans.

## Read before changing code

1. `assist/README.md`
2. `assist/AGENT-GUIDE.md`
3. `assist/governance/rules.md`
4. The owning module, its public exports, composition point, and tests.

Read additionally when relevant:

- Module or cross-app work: `architecture/module-boundaries.md`
- Identity, permissions, or tenancy: `architecture/identity-and-access.md`
- Data or migrations: `operations/database-migration-runbook.md`
- Development runtime: `operations/development-supervisor.md`
- Agent, worktree, or parallel task: `architecture/agent-orchestration.md`
- UI: `skills/design-user-interface/SKILL.md`

## Permanent boundaries

- The framework is tenancy-neutral.
- Platform owns host composition, identity, public host contracts, persistence infrastructure, and application registry.
- Applications and add-ons own their business modules, tables, routes, workers, UI, and seeds.
- Identity is shared; tenant context is an optional add-on.
- Use public contracts and events. Never import private sibling implementation files or query another module's tables.
- Do not copy authentication, authorization, tenancy, or generic persistence into applications.

## Work procedure

Before editing, identify owner, public contract, persistence effects, security effects, and test scope. Preserve unrelated dirty work.

During editing, keep composition roots limited to wiring. Put behavior in the owning module. Migrations are structural; seeds are repeatable and never overwrite user data.

Before handoff, run focused checks plus the repository check. Report static, database, and live-runtime evidence separately. Never call a skipped check successful.

## Parallel work

Parallel writable tasks use isolated Git worktrees with declared non-overlapping file scopes. A parent task reviews dependency and quality evidence before merge. Do not let an agent modify rules, skills, prompts, learned guidance, secrets, deployment, or protected branches without human review.

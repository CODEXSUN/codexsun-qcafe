# Zetro

## Purpose and features

**Zetro**

### Why this module exists

Coordinate discussions, reviews, task handoff, and isolated agent requests.

### Features and boundaries

API and web workspace; projects and conversations; JSON settings; SQLite records; workflow controls; task handoff; review library. Complete cloud authorization, device enrollment, and mobile integration remain pending.

### Production work flow

Zetro uses a durable work case to connect discussion, orchestration, AI Task execution, evidence, reviewed learning, and an optional Orship release. Each transition is recorded in SQLite with a correlation identifier. The Review Library is the approval surface for learning proposals; accepting a proposal makes it eligible for future prompt recall but never edits source, rules, or skill files.

Completed AI Task evidence must be approved before Zetro can prepare an Orship release. The prepared release still requires Orship approval before any external release routine runs.

### Integration

Use this module's public exports or registered API contracts. Do not read another module's tables or import its private implementation.

Ownership is registered in `assist/manifest.json` at the repository root. Run `npm.cmd run check` from the root for repository validation.

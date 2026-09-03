# Repository guidance

Read `assist/README.md` before you change code.

Preserve module ownership. Use public contracts for all cross-module communication.

Do not execute generated code on the host. Use an approved isolated execution provider.

Do not let an agent change code, rules, prompts, or learned guidance without review.

Use npm workspaces. Do not add pnpm lockfiles or workspace files.

Use `npm.cmd run dev` for port, database, API, and web startup preflight.

Run `npm.cmd run check` after focused changes.

Do not bump, commit, or push unless the user explicitly requests that operation.

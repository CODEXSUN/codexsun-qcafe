---
name: develop-os-module
description: Create or change a CODEXSUN OS platform module, application module, add-on, or feature while preserving runtime boundaries.
---

# Develop an OS module

Read `assist/architecture/architecture.md` and `assist/rules/engineering-rules.md`.

Identify the module owner and public contract before editing code.

Keep routes, services, state, permissions, and tests with the owning module.

Use the registry contract for lifecycle integration. Do not edit the kernel for a product-specific feature.

For all user-facing UI work, read `assist/skills/design-user-interface/SKILL.md`.

For a user-facing feature workspace, also read `assist/skills/interface-topology-overlay/SKILL.md` and update its topology registry.

Run the focused tests and the root check before handoff.

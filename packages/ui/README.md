# Shared UI

## Purpose and features

**Shared UI**

### Why this module exists

Give application interfaces consistent reusable controls.

### Features and boundaries

Shared React components, hooks, theme primitives, and public component exports. Business behavior stays in applications.

### Integration

Use this module's public exports or registered API contracts. Do not read another module's tables or import its private implementation.

Ownership is registered in `assist/manifest.json` at the repository root. Run `npm.cmd run check` from the root for repository validation.


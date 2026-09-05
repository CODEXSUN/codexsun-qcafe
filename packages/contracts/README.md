# Shared Contracts

## Purpose and features

**Shared Contracts**

### Why this module exists

Keep cross-module data shapes consistent.

### Features and boundaries

Validated manifests; deployment states; shared runtime types. This package owns contracts, not operational records.

### Integration

Use this module's public exports or registered API contracts. Do not read another module's tables or import its private implementation.

Ownership is registered in `assist/manifest.json` at the repository root. Run `npm.cmd run check` from the root for repository validation.


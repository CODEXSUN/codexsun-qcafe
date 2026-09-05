# Platform Runtime

## Purpose and features

**Platform Runtime**

### Why this module exists

Compose registered modules into a platform runtime.

### Features and boundaries

PlatformCore; module registry; dependency validation; runtime snapshots. Operational storage remains with its owner.

### Integration

Use this module's public exports or registered API contracts. Do not read another module's tables or import its private implementation.

Ownership is registered in `assist/manifest.json` at the repository root. Run `npm.cmd run check` from the root for repository validation.


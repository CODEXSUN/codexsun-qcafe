# DevKit

## Purpose and features

**DevKit**

### Why this module exists

Keep developer tools separate from the platform kernel.

### Features and boundaries

Developer workspace and integration of the ITO add-on. This repository's DevKit is not the full external DevKit repository.

### Integration

Use this module's public exports or registered API contracts. Do not read another module's tables or import its private implementation.

Ownership is registered in `assist/manifest.json` at the repository root. Run `npm.cmd run check` from the root for repository validation.


DevKit is the developer workspace application at `apps/devkit/web`.

It owns developer-focused tools, views, and user-experience features.

DevKit does not own core state or execution-provider behavior. It uses public contracts when those integrations are added.

DevKit owns the reusable `@codexsun/devkit-ito` add-on. Applications bind the add-on through its public package API.

# CODEXSUN OS Core

## Purpose and features

**CODEXSUN OS Core**

### Why this module exists

Host independent applications through public contracts.

### Features and boundaries

Application registry; API composition; shared shell; identity integration; platform database lifecycle. Zetro owns agent planning.

### Integration

Use this module's public exports or registered API contracts. Do not read another module's tables or import its private implementation.

Ownership is registered in `assist/manifest.json` at the repository root. Run `npm.cmd run check` from the root for repository validation.


The core owns platform composition, module registration, and the application holder. Zetro owns agent planning and coordination.

The `api` surface provides runtime contracts. The `web` surface provides the operator interface.

Keep execution providers behind framework contracts. Do not run generated application code in either surface.

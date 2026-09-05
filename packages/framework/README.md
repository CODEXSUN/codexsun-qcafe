# Framework

## Purpose and features

**Framework**

### Why this module exists

Coordinate module lifecycle independently of application business rules.

### Features and boundaries

Module definitions; dependency ordering; service bindings; startup, shutdown, and rollback.

### Integration

Use this module's public exports or registered API contracts. Do not read another module's tables or import its private implementation.

Ownership is registered in `assist/manifest.json` at the repository root. Run `npm.cmd run check` from the root for repository validation.


`@codexsun/framework` is the tenancy-neutral application kernel for CODEXSUN OS.

It owns:

- validated module definitions and dependency ordering;
- explicit service bindings;
- ordered registration and startup;
- reverse-order shutdown;
- rollback after partial startup failure;
- application and module lifecycle state.

It does not own HTTP routes, databases, authentication, business entities, deployment providers, or user interfaces. Those concerns belong to Platform, applications, or add-ons.

## Module example

```ts
import { createToken, defineModule, FrameworkApplication } from "@codexsun/framework";

const clockToken = createToken<{ now(): Date }>("clock");
const app = new FrameworkApplication();

app.services.bindValue(clockToken, { now: () => new Date() });
app.register(defineModule({
  manifest: {
    capabilities: ["health"],
    dependencies: [],
    description: "Core platform services.",
    id: "platform.core",
    kind: "platform",
    name: "Platform core",
    runtime: "node",
    version: "1.0.0",
  },
  start({ services }) {
    services.resolve(clockToken).now();
  },
}));

await app.start();
```

Module manifests are public compatibility contracts. Modules must declare dependencies by stable module ID and communicate through service tokens or another versioned public contract.

## Tenancy boundary

The framework has no tenant type, tenant context, tenant database selection, or tenant-aware lifecycle. A future tenancy add-on can provide those capabilities through public service tokens and module contracts without changing the kernel.

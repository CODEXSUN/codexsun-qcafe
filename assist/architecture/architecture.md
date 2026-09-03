# CODEXSUN OS architecture

## Purpose

CODEXSUN OS builds and runs multiple applications from one source repository.

The core manages desired state. Execution providers manage isolated application instances.

## Planes

The core owns applications, releases, deployments, agents, policy, audit, and provider selection.

The execution plane owns isolated processes, networks, volumes, resource limits, health checks, and logs.

Applications communicate through versioned HTTP APIs and events. They do not access another application's database.

## Runtime layers

```text
Interface -> Core -> Framework -> Execution provider -> Isolated instance
```

The framework defines contracts and lifecycle hooks. It does not own business behavior.

The framework kernel is tenancy-neutral. Tenancy, tenant context, tenant storage,
and tenant authorization belong to a separate add-on and are not implicit in a
module lifecycle or service scope.

The runtime registry validates module manifests and resolves their dependencies.

## Framework and Platform boundary

`packages/framework` owns module validation, dependency ordering, explicit
service bindings, application startup, shutdown, and startup rollback.

`packages/runtime` owns core runtime state and uses the framework
kernel. `apps/platform` is the deployable host: it selects modules, binds host
adapters, and exposes transport endpoints. The host must not move product or
add-on behavior into the framework.

## Source ownership

Platform areas use a two-level owner boundary:

```text
apps/platform/<area>/<surface>
```

The first area is `apps/platform/core`. It owns the `api` and `web` deployable surfaces.

Future areas can own their own surfaces without placing unrelated code in a generic platform API.

Product applications live in `apps/<application>/web`. DevKit owns developer-focused tools and user-experience features in `apps/devkit`.

DevKit-owned reusable add-ons live in `packages/devkit-*`. Applications bind them through package exports and never import DevKit internals.

## Deployment lifecycle

```text
draft -> planned -> building -> ready -> deploying -> running
                                      |              |
                                      v              v
                                    failed        stopped
```

Every transition records its actor, reason, time, and correlation identifier.

## Agent lifecycle

```text
request -> plan -> policy check -> tool call -> observation -> evaluation -> proposal
```

An agent can collect evidence and propose a refinement. A reviewer must accept a durable refinement.

The first builder agent creates structured plans only. It has no mutation or deployment tools.

## Interactive workspaces

Core composes Chat and Zetro through public workspace add-on contracts.
`packages/chat/web` owns the authenticated DevKit Messenger adapter and direct-message UI.
`packages/zetro/web` owns specialist conversations and browser history.
`packages/zetro/api` dispatches to the isolated Agent Crew runtimes.
The shared desk owns navigation slots and layout. It does not contain chat records or agent behavior.

## Scale boundary

Start as a modular monolith. Keep the API, web process, worker, and execution instances separate.

Extract a service only after measurements show an independent scale or failure boundary.

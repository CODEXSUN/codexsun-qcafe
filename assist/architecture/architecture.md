# CODEXSUN OS architecture

## Purpose

CODEXSUN OS builds and runs multiple applications from one source repository.

The control plane manages desired state. Execution providers manage isolated application instances.

## Planes

The control plane owns applications, releases, deployments, agents, policy, audit, and provider selection.

The execution plane owns isolated processes, networks, volumes, resource limits, health checks, and logs.

Applications communicate through versioned HTTP APIs and events. They do not access another application's database.

## Runtime layers

```text
Interface -> Control plane -> Framework -> Execution provider -> Isolated instance
```

The framework defines contracts and lifecycle hooks. It does not own business behavior.

The runtime registry validates module manifests and resolves their dependencies.

## Source ownership

Platform areas use a two-level owner boundary:

```text
apps/platform/<area>/<surface>
```

The first area is `apps/platform/control-plane`. It owns the `api` and `web` deployable surfaces.

Future areas can own their own surfaces without placing unrelated code in a generic platform API.

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

## Interactive agent surface

The control-plane web application talks to a versioned chat API. The API owns conversation identifiers and delegates turns to a replaceable sidecar adapter.

The first adapter uses the Codex SDK with a read-only workspace sandbox and no approval prompts. It exposes structured activity summaries and usage without exposing private reasoning. Write-capable runs require a later persisted approval workflow.

## Scale boundary

Start as a modular monolith. Keep the API, web process, worker, and execution instances separate.

Extract a service only after measurements show an independent scale or failure boundary.

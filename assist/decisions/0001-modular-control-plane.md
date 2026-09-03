# Decision 0001: Modular control plane

Status: accepted

## Decision

Use one npm monorepo and a modular TypeScript control plane.

Run each deployed application through an isolated execution provider.

Start with a local provider contract. Add Docker and Cloudflare adapters after policy and audit controls pass.

Use Node.js for orchestration, React for the control plane, Python for supported workloads, and Rust for host adapters.

## Consequences

The first release favors fast local development. It does not promise production container scheduling.

Provider contracts must support later Docker, Kubernetes, and Cloudflare implementations.

# Engineering rules

## Ownership

- Give each module one owner.
- Keep business rules inside the owning module.
- Communicate through public contracts.
- Do not import another module's internal files.
- Do not query another module's tables.

## Runtime

- Validate every manifest before registration.
- Make deployment commands idempotent.
- Store desired state before execution.
- Record every state transition.
- Treat providers as replaceable adapters.

## Security

- Deny access by default.
- Scope every action to an actor and organization.
- Keep secrets out of manifests, logs, prompts, and source control.
- Run generated code only in an isolated execution provider.
- Require approval for external, destructive, or costly actions.

## Verification

- Test contracts at module boundaries.
- Test state transitions and retry behavior.
- Test tenant isolation.
- Run type checks and tests before handoff.

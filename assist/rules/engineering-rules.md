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

## Interface design

- Use the shadcn configuration owned by each web workspace as the shared component foundation.
- Use relaxed spacing for every CODEXSUN workspace. Do not add compact-density controls unless an accepted product requirement changes this rule.
- Apply resizable panels only where users compare or navigate adjacent workspace content.
- Use three light workspace surfaces: white for chrome, a soft neutral for drawers, and near-white for the active canvas.
- Use the Interface Topology Overlay (ITO) for user-facing feature workspaces. Keep its numbered labels as an independent transparent layer and place Topology Inspection above Notifications at the lower-right edge.

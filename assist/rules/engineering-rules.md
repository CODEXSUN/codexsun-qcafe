# Engineering rules

## Ownership

- CODEXSUN OS is only the platform host. Keep every product feature in an application or add-on.
- Keep agent behavior in standalone Zetro. Keep specialist runtimes in Docker-only Agent Crew. Neither belongs to the platform kernel.
- A platform installation must work with no applications or add-ons enabled.
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

- Use Tailwind utility classes for layout, spacing, typography, color, borders, and responsive behavior.
- Use custom CSS only for selectors, browser-specific behavior, animation, or behavior that Tailwind cannot express clearly.
- Use the shadcn configuration owned by each web workspace as the shared component foundation.
- Use semantic shadcn theme tokens for surfaces, text, borders, focus rings, and interaction states.
- Do not use hard-coded colors for theme-aware hover states.
- Use `hover:bg-accent hover:text-accent-foreground` for neutral controls.
- Add `cursor-pointer` to every enabled button, button-like link, menu item, and clickable control.
- Keep hover, focus, active, open, and selected states in the same shadcn token family.
- Use relaxed spacing for every CODEXSUN workspace. Do not add compact-density controls unless an accepted product requirement changes this rule.
- Apply resizable panels only where users compare or navigate adjacent workspace content.
- Use three light workspace surfaces: white for chrome, a soft neutral for drawers, and near-white for the active canvas.
- Use the Interface Topology Overlay (ITO) for user-facing feature workspaces. Keep its numbered labels as an independent transparent layer and place Topology Inspection above Notifications at the lower-right edge.

---
name: design-user-interface
description: Create or change a CODEXSUN user interface with the shared shadcn theme, Tailwind utilities, and standard interaction states.
---

# Design a user interface

Read `assist/rules/engineering-rules.md` and the closest workspace `components.json` before a UI change.

## Foundation

- Use the shared `@codexsun/ui` component when it exists.
- Use the workspace shadcn configuration for new primitives.
- Use Tailwind utilities for layout, spacing, typography, color, border, focus, and responsive behavior.
- Use custom CSS only when Tailwind cannot express the required behavior clearly.
- Preserve module ownership. Do not move product behavior into the shared UI package.

## Color and theme

- Use semantic shadcn tokens for every theme-aware surface and interaction state.
- Use tokens such as `background`, `foreground`, `card`, `popover`, `muted`, `accent`, `border`, `input`, and `ring`.
- Use matching foreground tokens with each background token.
- Do not add hard-coded light and dark hover colors.
- Use `hover:bg-accent hover:text-accent-foreground` for a neutral interactive control.
- Use the shared Button variant for primary, secondary, destructive, outline, ghost, and link actions.
- Make sure one component works in light and dark themes without separate color overrides.

## Important button rule

- Add `cursor-pointer` to every enabled button, button-like link, menu item, and clickable control.
- Do not depend on the browser default cursor for an interactive control.
- Use the shared Button primitive when its contract fits the action.
- Keep disabled controls non-interactive and visually muted.
- Give keyboard focus the shadcn `ring` treatment.
- Match hover, focus, active, open, and selected states to the same theme token family.

## Verification

- Check hover and focus states in light and dark themes.
- Check icon-only controls for an accessible name and a visible tooltip.
- Search changed UI files for hard-coded hover colors.
- Run the owning workspace typecheck and production build.
- Run the repository check before handoff.

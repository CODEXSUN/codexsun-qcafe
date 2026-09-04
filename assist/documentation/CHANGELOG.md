# CODEXSUN OS Changelog

## Version State

Current version: 0.1.4

Release tag: v-0.1.4

Changelog label: v 0.1.4

## Unreleased

### DevKit application and reusable ITO add-on

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Added DevKit as a separate developer workspace application.
- Added DevKit startup on port 5174 to the shared development preflight and stack.
- Moved the Interface Topology Overlay into the DevKit-owned `@codexsun/devkit-ito` add-on.
- Added a public registry and mapped-boundary API for any CODEXSUN web workspace.
- Bound the shared ITO add-on to the DevKit and control-plane workspaces.
- Added General and Developer settings pages to the control-plane workspace.
- Connected the left-bottom Settings action to settings navigation in the workspace drawer.

### Main MDI workspace and navigation rail

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Added the shared Main MDI shell with a command bar, utility dock, context dock, workspace navigation, and workspace surface.
- Added a full-height workspace navigation rail based on the shadcn `sidebar-05` interaction model.
- Connected the command bar, rail click action, and Ctrl+B shortcut to the same workspace navigation state.
- Added hover and keyboard-focus guidance for the navigation rail.
- Added ITO entries for the workspace canvas, navigation, navigation rail, and workspace surface.
- Cleared workspace canvas child blocks and reserved the full canvas for the next MDI feature.
- Bound the shared AppSidebar and SidebarInset composition inside the workspace canvas.

## v-0.1.4

### [v 0.1.4] 2026-09-04 7:35 a.m. - working on q-cafe pos

#### Database Changes

- Database update: Yes.

#### App Codebase Changes

- Bumped the workspace version to 0.1.4.

## v-0.1.3

### [v 0.1.3] 2026-09-03 10:37 p.m. - updated zetro agent flow

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped the workspace version to 0.1.3.

## v-0.1.2

### [v 0.1.2] 2026-09-03 8:49 p.m. - working on frontend for chat and agent

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped the workspace version to 0.1.2.

## v-0.1.1

### [v 0.1.1] 2026-09-03 10:17 a.m. - Interactive workspace and ITO inspection

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped the workspace version to 0.1.1.

## v-0.1.0

### [v 0.1.0] 2026-09-03 8:55 am - OS foundation

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Added the modular control-plane API and web surfaces.
- Added port and database preflight checks with clean development stack startup.
- Added reviewed builder-agent, runtime registry, architecture, rules, and repository skills.
- Added lockstep version, changelog, and reviewed GitHub commit helpers.
- Added the interactive GitHub review flow with an optional version bump and final mutation confirmation.
- Added the first interactive Codex chat with a read-only sidecar, conversation continuity, activity summaries, and token usage.
- Redesigned chat as a five-panel engineering workspace with independent docks, drawers, center canvas, and a collapsible global menu.
- Added the shadcn design-system foundation and a resizable workspace boundary, and standardized all workspaces on relaxed spacing.
- Updated the shared workspace menu to a white, dark, icon-first command bar.
- Added a numbered purple technical map with a selectable right-side inspector for workspace sections and blocks.
- Moved workspace drawer controls to the bottom edge and introduced the three-step light workspace surface system.
- Named the Interface Topology Overlay, moved Topology Inspection to a floating glass control, and added the feature-workspace skill.
- Moved the workspace drawer toggle to its top edge, added edge-hover guidance, and added the Ctrl+B shortcut.
- Made Interface Topology Overlay labels copy their section names while opening the matching inspector entry.
- Simplified the floating ITO alias to an unboxed icon-and-label control.
- Expanded the Interface Topology Overlay inspector across the workspace with an overflow-only thin scrollbar.
- Reserved clear top-bar space for the workspace drawer edge toggle.
- Added the ITO Boundary Highlighter for layout inspection with 2px purple section rings.
- Restored the ITO inspector as a compact responsive side drawer with one-line section text.
- Moved the workspace drawer control inside the center workspace to prevent splitter clipping.
- Updated the ITO Boundary Highlighter to ring only the selected section and show its selection tick.
- Removed the repeated selected-section heading and added the ITO number-card visibility switch.
- Organized the ITO inspector title and actions into separate header rows.
- Added click-away dismissal for the ITO inspector drawer.

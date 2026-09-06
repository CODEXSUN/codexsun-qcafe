# CODEXSUN OS Changelog

## Version State

Current version: 0.1.19

Release tag: v-0.1.19

Changelog label: v 0.1.19

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

## v-0.1.19

### [v 0.1.19] 2026-09-06 9:58 a.m. - Release-aligned cloud runtime images

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped the workspace version to 0.1.19.
- Aligned cloud Docker image and rollback tags with the active CODEXSUN OS release.

## v-0.1.18

### [v 0.1.18] 2026-09-06 9:48 a.m. - Zetro Desk, ZXA connections, and Today workspace

#### Database Changes

- Database update: Yes.

#### App Codebase Changes

- Bumped the workspace version to 0.1.18.
- Added the ZXA local runtime connection workspace with Codex device authorization and Gemini/OpenCode connection settings.
- Added the Today workspace for focused local task tracking in the web and desktop navigation.
- Split the cloud portal into lazy-loaded workspace bundles and rebuilt the Zetro Desk desktop installers.

## v-0.1.17

### [v 0.1.17] 2026-09-06 9:33 a.m. - Cloud database Docs authoring

#### Database Changes

- Database update: Yes.
- Added the Docs-owned `docs_pages` MariaDB table for shared cloud pages.
- Seeded the table from packaged Docs content only when the table is empty.

#### App Codebase Changes

- Bumped the workspace version to 0.1.17.
- Replaced runtime local-file and SQLite Docs reads with MariaDB page reads.
- Added authenticated page creation and upsert editing for Identity administrators.
- Added the Docs editor and dynamic grouped navigation for database-backed pages.
- Configured the cloud Docs service to use the Platform database connection and internal Identity verification.

## v-0.1.16

### [v 0.1.16] 2026-09-05 11:14 a.m. - Unified cloud and desktop release

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped the workspace version to 0.1.16.
- Published the cloud and desktop release from the same 0.1.16 source version.
- Retained credentialed CORS support for approved Tauri desktop origins.
- Included Docs MDX content in the cloud source package required by the Platform image.
- Aligned cloud Compose image labels and rollback targets with 0.1.16.

## v-0.1.15

### [v 0.1.15] 2026-09-05 10:43 a.m. - Desktop cloud credentialed CORS

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped the workspace version to 0.1.15.
- Allowed credentialed requests from approved Tauri desktop origins at the Platform API and cloud reverse proxy.
- Added a CORS regression test for desktop identity preflight requests.
- Aligned the CODEXSUN desktop bundle metadata with version 0.1.15.

## v-0.1.14

### [v 0.1.14] 2026-09-05 9:34 a.m. - Working on DCO against devices

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped the workspace version to 0.1.14.

## v-0.1.13

### [v 0.1.13] 2026-09-05 12:59 a.m. - ZXA controlled updates, image processing, and commit hygiene

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped the workspace version to 0.1.13.
- Added a persistent ZXA runtime volume for CLI releases.
- Added a shell command and API routes to check and apply Codex, Gemini, and OpenCode CLI updates.
- Installed each CLI update in a new release directory before switching the active runtime link.
- Added checksum validation, staging, and reviewed activation for agent definition files.
- Added isolated PNG, JPEG, WebP, and GIF metadata inspection.
- Passed image inputs to Codex and shared local image references with Gemini and OpenCode.
- Removed temporary image files after each request.
- Kept the ZXA root filesystem read-only with dropped capabilities and no-new-privileges enabled.
- Excluded Rust build output and generated Tauri schemas from Git commit candidates.
- Disabled Interface Topology Overlay (ITO) by default across production and clean installations:
  - Defaulted label visibility to `false` in `@codexsun/devkit-ito`, omitting marker DOM elements unless explicitly enabled.
  - Initialized highlight states to `false` and strictly suppressed highlight outlines and box shadows when disabled.
  - Defaulted `showItoIcon` to `false` in Q-Cafe settings, requiring explicit user activation in Settings before mounting the floating inspection button or drawer.
  - Added CSS safeguards ensuring `.technical-label` has `display: none !important` when labels are inactive.

## v-0.1.12

### [v 0.1.12] 2026-09-05 12:44 a.m. - Visual POS unification, offline image storage folder with write protection, and bundled demo media

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped the workspace version to 0.1.12.
- Unified POS navigation: Retired the separate `POS-1` menu entry and connected `POS` directly to the visual billing desk (`Pos1`). Added automatic hash redirection from `#POS-1` to `#POS`, updated global search palette, user actions, and header labels.
- Added configurable Image Storage Folder path in Settings allowing cashiers and store owners to keep restaurant media anywhere on their local computer or network drive (defaulting to `C:\q-cafe\images`).
- Added Write Protection Permission toggle for image uploads to safeguard existing item photos from accidental overwrite or deletion on production counter terminals.
- Added "Test & Verify Folder" action button with test tube / flask icon to validate folder path syntax and verify active read/write permissions.
- Pre-bundled 10 self-contained, offline demo food and drink SVG illustrations into `public/demo-images/` and added a 1-click "Install 10 Demo Items & Images" button in Settings and Masters.
- Updated Item Master to display the active image storage folder path, write-protection status, and quick-select demo photo presets.
- Updated Tauri Content Security Policy (CSP) in `tauri.conf.json` to permit `data:`, `blob:`, and `https:` in `img-src` so custom uploaded and demo images render reliably across offline desktop installations.
- Updated desktop packaging (`tools/package-q-cafe-desktop.mjs`) to produce a compressed zip archive (`qcafe-0.1.12-x64-setup.zip`) alongside the setup `.exe` and `.msi` installers.

## v-0.1.11

### [v 0.1.11] 2026-09-04 11:29 p.m. - Zetro desktop agent workspace

#### Database Changes

- Database update: Yes.
- Added SQLite storage for Zetro projects, conversations, settings, agent runs, and AI tasks.
- Added repeatable table creation for local development and desktop runtime state.
- Kept Redis optional through the `OS_REDIS_ENABLED` development switch.

#### App Codebase Changes

- Bumped the workspace version to 0.1.11.
- Updated the CODEXSUN and Q Cafe Tauri package metadata to 0.1.11.
- Defined CODEXSUN OS as the application holder and kept product behavior in module-owned packages.
- Added Zetro as a standalone agent module with its own API, web workspace, Docker runtime, conversations, and project settings.
- Connected Zetro to isolated Docker agents and exposed agent health, selection, and orchestration controls.
- Added Sequential and LangGraph workflow modes with review steps, evidence, and manual approval gates.
- Added the reusable AI Task System with task planning, execution steps, status tracking, and Zetro coordination.
- Added the Zetro side car with projects, conversation groups, search, new chat, rename, pin, archive, and removal actions.
- Kept the unassigned Conversations group visible directly below Projects, including its empty state.
- Added persistent Add-ons groups to the Zetro side car with create, edit, pin, archive, remove, and nested-chat actions.
- Connected Zetro conclusions to the AI Task System with prompt and chat review, task execution, live status checks, returned agent evidence, capability details, step counts, and duration metrics.
- Added a Zetro Review Library page with prompt, result, and task tabs, multi-select controls, consolidated review, re-analysis, task handoff, and evidence-backed skill refinement proposals.
- Added the `zxa:v1` reference Docker runtime with isolated Codex, Gemini, and OpenCode connections, provider-specific APIs, parallel dispatch, safe connection metadata, and frontend scaffolds for ZXA, Nexus, Orbis, Axon, and Kore.
- Reconciled persisted Zetro agent settings with the active Docker registry so changing from the former Zetro runtime to ZXA selects a valid agent automatically.
- Added repository root, GitHub URL, and Docker agent settings through the workspace properties drawer.
- Added repository-scoped folder browsing and nested folder creation with explicit user confirmation.
- Rejected absolute paths, parent traversal, invalid Windows names, and folder paths outside the configured repository root.
- Connected the central Chat workspace to the local Chat API on port 4165.
- Added a loopback-only generator for short-lived Chat access tokens in Platform Settings.
- Kept generated Chat access tokens in application memory and allowed the Tauri desktop origin through CORS.
- Added the Tauri desktop package, local runtime launcher, production web builder, Windows executable, MSI, and NSIS installer.
- Added stable query-string routing so active workspaces and pages survive browser refreshes.
- Renamed the workspace navigation panel to `mdi.sideCar` and bound module-owned side car content to the shared MDI canvas.
- Added responsive Zetro prompt controls for text, image, file, and voice input.
- Split Platform and Zetro production JavaScript through Vite 8 Rolldown chunk groups.
- Reduced the Platform entry chunk from about 832 KB to about 19 KB and removed the 500 KB build warning.
- Verified module contracts, type checks, API tests, workspace tests, production web builds, and Windows desktop bundles.

## v-0.1.10

### [v 0.1.10] 2026-09-04 1:48 p.m. - Q Cafe production Windows window

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped the workspace version to 0.1.10.
- Build the production Q Cafe desktop executable as a Windows GUI application without a terminal window.

## v-0.1.9

### [v 0.1.9] 2026-09-04 1:42 p.m. - Q Cafe hidden Windows backend terminal

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped the workspace version to 0.1.9.
- Hide the production Q Cafe Node API console window while retaining development output.

## v-0.1.8

### [v 0.1.8] 2026-09-04 1:34 p.m. - Q Cafe Windows installer runtime

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped the workspace version to 0.1.8.
- Rebuilt the self-contained Q Cafe Windows installers with the verified API runtime launcher.

## v-0.1.7

### [v 0.1.7] 2026-09-04 1:29 p.m. - Q Cafe reliable Windows API runtime

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped the workspace version to 0.1.7.
- Made Q Cafe extract its owned API and migrations before Windows desktop startup.

## v-0.1.6

### [v 0.1.6] 2026-09-04 1:20 p.m. - Q Cafe self-contained Windows installer

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped the workspace version to 0.1.6.
- Bundled an app-owned Node runtime in the Q Cafe MSI and NSIS installers.
- Fixed release artifact selection so each installer matches its version.

## v-0.1.5

### [v 0.1.5] 2026-09-04 11:08 a.m. - Q Cafe POS billing and Windows installers

#### Database Changes

- Database update: Yes.

#### App Codebase Changes

- Bumped the workspace version to 0.1.5.
- Added Q Cafe POS billing tables for restaurant tables, bills, POS items, receipts, and receipt transactions.
- Added taxable, GST, grand-total, partial-payment, mixed-payment, activity, and future-sync records to the Q Cafe SQLite database.
- Added the keyboard-first Q Cafe POS billing screen and versioned Windows installer packaging.

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

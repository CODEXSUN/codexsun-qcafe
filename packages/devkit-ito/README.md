# ITO — Interface Topology Overlay

## Purpose and features

**ITO — Interface Topology Overlay**

### Why this module exists

Make interface regions identifiable for inspection and maintenance.

### Features and boundaries

Region registry; numbered labels; boundary highlighting; inspector; copy actions; persistent visibility switch.

### Integration

Use this module's public exports or registered API contracts. Do not read another module's tables or import its private implementation.

Ownership is registered in `assist/manifest.json` at the repository root. Run `npm.cmd run check` from the root for repository validation.


Owner: DevKit developer experience.

This add-on works with any CODEXSUN web workspace.

The consuming workspace provides its own stable section registry. It also applies `regionProps` to each mapped boundary.

The add-on owns the labels, clipboard action, inspector, click-away behavior, label switch, and boundary highlighter. The label switch is stored locally per browser profile and remains off after refresh until it is enabled again.

Import only the public package entry and `@codexsun/devkit-ito/styles.css`.

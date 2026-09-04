# Platform host contracts

`@codexsun/identity-contracts` contains versioned DTOs, claims, and events. It
contains no persistence or application behavior.

`@codexsun/platform-host-contracts` exposes authentication and authorization
interfaces. Applications consume these public contracts only. They do not read
identity tables, import identity internals, or verify tenant tokens themselves.

The Platform host composes a concrete identity adapter. An application receives
an actor, permissions, application entitlements, and an optional server-resolved
tenant context.

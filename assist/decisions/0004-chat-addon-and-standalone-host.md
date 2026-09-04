# Decision 0004: Chat add-on and standalone host

Status: accepted by the product owner in this request.

## Ownership

The Chat package owns its contracts, domain, application services, infrastructure ports, HTTP interface, feature state, workspace UI, tests, and standalone host.
The shared desk owns layout and navigation slots.
An application binds Chat through the `@codexsun/chat-web` public exports.

## Public contract

`createChatWorkspaceAddon` creates an application-specific Chat binding.
The binding can set the label, identifier, API URL, demo settings, and transport factory.
`ChatTransport` defines the backend operations that the workspace needs.

The `chatWorkspaceAddon` export keeps the default DevKit Messenger binding.
This compatibility export prevents a forced migration for current consumers.

The old `apps/chat/api` prototype is removed.
The replacement backend is `packages/chat/api` and uses the central contract.
The repository has one Chat source owner under `packages/chat`.

## Backend structure

The backend is a modular monolith with domain, application, infrastructure, and interface layers.
The application layer uses ports for identity, persistence, events, and time.
Development uses in-memory adapters.
Production adapters can replace them without changing domain behavior.

## Standalone host

The Chat package includes a Vite host on port 5176.
The standalone host and embedded hosts render the same workspace implementation.
No host copies Chat state or UI code.

## Security

The default adapter keeps the access token in memory.
The adapter permits plain HTTP only for loopback addresses.
Each custom transport must enforce its own authentication and tenant rules.

## Verification

Run the Chat tests, type check, and production build.
Run the platform type check and production build.
Run the repository check before handoff.

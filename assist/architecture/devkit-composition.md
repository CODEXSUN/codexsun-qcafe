# DevKit composition

DevKit remains a product application. Its task and project modules remain owned
by DevKit until their separate migration is approved.

When enabled, DevKit consumes `@codexsun/platform-host-contracts` for actor,
application entitlement, and authorization. It must not import Platform identity
or tenancy implementation files.

Every application may ask the Platform host for its authenticated context at
`/api/v1/apps/:applicationId/context`; the response is available only when the
actor has `app.access` and an entitlement for that application.

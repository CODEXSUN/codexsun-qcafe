# Identity and access architecture

Identity is a Platform foundation. It owns credentials, sessions, token issue,
refresh, revocation, audit events, and the canonical token-key resolver.

Access control is a separate domain. It owns roles, grants, protected records,
and backend authorization decisions. Identity never decides a business action.

Tenant context is an optional add-on. A single-client application uses identity
without tenant claims. A tenant-enabled application receives tenant context only
after the server resolves its trusted host/domain and application entitlement.

The JWT verifier selects a key only through its `kid` resolver. Issuers and
verifiers must use the same resolver contract; root-secret-only verification is
not permitted for tenant-derived keys.

# Identity security rules

- Deny missing, expired, revoked, wrongly typed, or unknown-key tokens.
- Resolve signing keys by `kid`; never trust an unverified tenant claim as a key.
- Rotate refresh tokens and revoke server-side sessions.
- Do not seed default credentials.
- Resolve tenant context on the server; never accept caller-selected tenancy.
- Enforce permissions in backend services and repositories.

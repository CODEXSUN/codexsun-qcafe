# Platform Identity

## Purpose and features

**Platform Identity**

### Why this module exists

Give applications one public identity and authorization boundary.

### Features and boundaries

Identity services and routes; token verification; repository adapters; identity events. Applications consume public contracts.

### Integration

Use this module's public exports or registered API contracts. Do not read another module's tables or import its private implementation.

Ownership is registered in `assist/manifest.json` at the repository root. Run `npm.cmd run check` from the root for repository validation.

### First-time password setup

Set `OS_FIRST_LOGIN_SETUP=true` on the Identity server to offer password setup. It defaults to false.
The operator enters their email, the existing `OS_SUPER_ADMIN_PASSWORD` from the private `.env` as a one-time setup code, and a new password of at least 16 characters.
The server stores a salted scrypt hash. An atomic password replacement revokes previous sessions. Only one concurrent setup request can succeed.
Setup closes once the stored password differs from the bootstrap credential. It stays closed after a restart even if the switch remains true.
This flow does not reset an account whose password has already changed. Seeds never overwrite existing passwords.
Never publish the bootstrap credential or embed it in a web or desktop build.

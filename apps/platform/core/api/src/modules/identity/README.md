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
The VPS bootstrap script creates a 10-digit `OS_FIRST_LOGIN_SETUP_CODE` in private `config/operator.env` and expires it after 30 minutes. Run `npm.cmd run identity:first-login-code` to write a new local code, then run `npm.cmd run identity:first-login-sync` to make that code active on the VPS. After setup, run `npm.cmd run identity:first-login-close`, then `npm.cmd run identity:first-login-sync`, to set `OS_FIRST_LOGIN_SETUP=false` and clear the code fields both locally and on the VPS. The operator enters their email, that temporary code, and a new password of at least 8 characters.
The server stores a salted scrypt hash. An atomic password replacement revokes previous sessions. Only one concurrent setup request can succeed.
Setup closes once the stored password differs from the bootstrap credential. It stays closed after a restart even if the environment switch remains true; the server treats it as false.
This flow does not reset an account whose password has already changed. Seeds never overwrite existing passwords.
Never publish the bootstrap password or setup code, or embed either in a web or desktop build.

### Temporary password reset

Set `OS_PASSWORD_RESET=true` in private `config/operator.env` to open the reset page. The VPS bootstrap script creates a 10-digit `OS_PASSWORD_RESET_CODE` and sets a 30-minute expiry when the code is missing or expired. The account holder enters their email, the temporary code, and a new password. The service changes the stored hash and revokes prior sessions. Disable the switch after the reset. This temporary code check will be replaced with email delivery later.

# Platform access management

This Platform-owned workspace administers shared identity accounts. It provides
account list and upsert flows for roles, responsibilities, application access,
explicit permissions, and account suspension.

The Platform Identity API remains the canonical credential and session owner.
Access changes revoke the affected account sessions so the next request uses
the current authorization state. Applications consume verified host claims and
do not read these records directly.

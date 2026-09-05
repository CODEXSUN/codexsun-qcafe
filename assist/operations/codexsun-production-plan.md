# CODEXSUN OS deployment and desktop migration

Status: implementation plan. Current development services are not approved for public exposure.

## Public address

Use `https://os.codexsun.com` for Portal and versioned application APIs. Reserve `https://codexsun.com` for the main website. Desk and mobile use the application origin. DNS must point to the VPS. Configure HTTPS at the reverse proxy and keep backend ports private. VPS SSH access and DNS configuration have not been verified.

## Ownership and topology

Use the Docker Compose project name `codexsun-os`. Services keep their application names: platform-api, portal, zetro-api, zxa, and optional application services. An application owns its API, data, migrations, and health endpoint. Platform composes public contracts.

Desktop is Zetro Desk, the primary work surface. Portal provides status and client management. Mobile follows the same authenticated contracts. A cloud outage must not prevent local work.

## Preserve existing installations

Inventory image IDs, containers, mounts, and health before migration. Back up each SQLite database with a consistent database backup operation. Export Docker volumes separately and verify restore.

Existing ZXA volumes are `zxa_zxa-state`, `zxa_zxa-runtime`, and `zxa_zxa-workspace`. The replacement Compose configuration must reference these existing volumes explicitly during local migration. A different Compose project name must not accidentally create empty replacement data.

Do not use system prune, volume prune, or compose down with volumes. Retain the previous image until the replacement passes health, authentication, provider, and restart checks. Remove an obsolete image only by verified ID after it has no container references and no rollback role.

## Implementation order

1. Introduce one production Compose definition with local and VPS environment configuration. Require secrets. Use persistent volumes, internal service networking, resource limits, health checks, and restart policies.
2. Build production application artifacts in isolated multi-stage builds. Exclude local databases, credentials, desktop targets, and development output from Docker context.
3. Add authentication and authorization to every Zetro workspace, task, run, and communication endpoint before public routing. Enforce actor and project membership at the API.
4. Pair Desk devices with revocable credentials and explicit repository permissions. Let devices poll or subscribe outbound. Never expose a desktop shell endpoint publicly.
5. Add an authenticated communication inbox owned by Zetro. Accept schema-validated notices with project ID, source, severity, message, and idempotency key. Record actor and receipt time. Notices never become commands automatically.
6. Implement durable local outbox and cloud acknowledgments. Retry safely after connectivity returns. Use task claims and leases to prevent duplicate execution. Synchronize status independently of agent availability.
7. Package and test the installed Desk against local production APIs. Preserve application data across upgrade. Verify cloud endpoint configuration and CSP.
8. Deploy the same versioned images to the VPS behind HTTPS after restore and migration tests pass. Keep database and agent ports private.

## Required proof

Local: fresh startup, existing data migration, restart persistence, denied unauthorized requests, successful authorized requests, provider response, and installed Desk interaction.

Synchronization: offline edits, reconnect, duplicate delivery, conflicts, revoked device, worker crash, lease recovery, and independent project isolation.

Cloud: TLS, authenticated routing, database backup and restore, staging deployment, health checks, rollback, and reported deployment version.

Tests and health results must name the owning app. A healthy container does not prove a working model response or completed task.

## Current blockers

Zetro workspace and task routes currently lack a complete cloud authorization boundary. Zetro and task MariaDB adapters, device pairing, synchronization, and the communication inbox require implementation. The installed desktop currently expects separately running local APIs. Production readiness must not be claimed until these paths are verified.

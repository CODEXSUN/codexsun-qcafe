# Agent Crew

## Purpose and features

**Agent Crew**

### Why this module exists

Give specialist agents separate duties and isolated runtimes.

### Features and boundaries

Docker profiles; reviewed skills; per-agent state; registry integration; backup and restore tooling. Configured demo responses do not prove live model execution.

### Integration

Use this module's public exports or registered API contracts. Do not read another module's tables or import its private implementation.

Ownership is registered in `assist/manifest.json` at the repository root. Run `npm.cmd run check` from the root for repository validation.


Agent Crew contains Docker-only specialist agents. Zetro owns the standalone API and web chat.

1. Copy `docker/.env.example` to `docker/.env` and set unique random tokens.
2. Set the matching token variables for the Zetro API. It loads the local registry by default.
3. Copy `docker/zetro-agents.example.json` to an operator-owned path and set `ZETRO_AGENTS_FILE` when endpoints differ.
4. Run `docker compose --env-file docker/.env -f docker/compose.yaml up --build`.
5. Run `npm.cmd run dev` from the repository root to start the platform, DevKit, and Zetro.

The development Compose file binds each agent to a different loopback port. Remote clients cannot access these ports.
On a server, keep agents on a private network. Put the platform behind authenticated TLS ingress.

Each profile directory contains reviewed duties and skills. Each state directory contains reviewed memory and conversations.
The runtime cannot edit a read-only profile. A reviewer must accept profile and memory changes before an operator applies them.

To create a portable backup inside one container, run:

```text
node dist/backup.js backup /backup/image-agent.json
```

Mount a private backup directory for this operation. Restore into empty profile and state volumes on the target server:

```text
node dist/backup.js restore /backup/image-agent.json image-agent
```

The archive validates its schema, agent identity, allowed paths, profile skills, and SHA-256 content checksums.
Transfer credentials separately. Backups do not contain model or API credentials.

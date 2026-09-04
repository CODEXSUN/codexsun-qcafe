import type { Generated } from "kysely";

export type PlatformDatabaseSchema = {
  identity_accounts: { application_ids: string; id: string; login: string; password_hash: string; permissions: string; scope: "single-client" | "tenant"; tenant_id: string | null };
  identity_sessions: { account_id: string; id: string; refresh_token_id: string; revoked_at: string | null };
  platform_events: {
    created_at: string;
    event_type: string;
    id: string;
    payload: string;
  };
  platform_migrations: {
    applied_at: string;
    name: string;
  };
  platform_outbox: {
    attempts: Generated<number>;
    available_at: string;
    created_at: string;
    event_id: string;
    id: string;
    payload: string;
    state: string;
    topic: string;
    updated_at: string;
  };
};

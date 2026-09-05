export type AppOverrideRecord = {
  application_id: string;
  display_name: string | null;
  id: string;
  notes: string | null;
  state: "active" | "disabled";
  updated_at: string;
  updated_by: string;
};

export type AppRegistryAuditEvent = {
  action: "state_changed" | "override_updated" | "runtime_action";
  actorId: string;
  applicationId: string;
  details: Record<string, unknown>;
  timestamp: string;
  type: string;
};

export type AppRegistryDatabaseSchema = {
  platform_app_overrides: AppOverrideRecord;
};

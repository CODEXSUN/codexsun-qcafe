import { randomUUID } from "node:crypto";
import type { Kysely } from "kysely";
import type { PlatformDatabaseSchema } from "../../database/schema.js";
import { hashPassword } from "./service.js";

/** Provision only a missing operator; never reset existing accounts during startup. */
export async function seedIdentity(database: Kysely<PlatformDatabaseSchema>, environment: NodeJS.ProcessEnv): Promise<void> {
  const login = environment.OS_SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const password = environment.OS_SUPER_ADMIN_PASSWORD;
  if (!login && !password) return;
  if (!login || !password || password.length < 16) throw new Error("Operator provisioning needs an email and a password of at least 16 characters.");
  const existing = await database.selectFrom("identity_accounts").select("id").where("login", "=", login).executeTakeFirst();
  if (existing) return;
  await database.insertInto("identity_accounts").values({
    id: randomUUID(), login, password_hash: await hashPassword(password), scope: "single-client", tenant_id: null,
    application_ids: JSON.stringify(["app.zetro", "app.chat", "app.ai-task-system", "app.device-chat", "app.docs"]),
    permissions: JSON.stringify(["app.access", "identity.admin", "installation.manage", "devices.manage", "chat.access", "tasks.manage", "zetro.access"]), role: "administrator", responsibilities: JSON.stringify(["Platform administration"]), status: "active",
  }).execute();
}

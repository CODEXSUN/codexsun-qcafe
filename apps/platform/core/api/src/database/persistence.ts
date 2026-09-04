import { randomUUID } from "node:crypto";
import { Kysely, MysqlDialect } from "kysely";
import { createPool } from "mysql2";
import { createConnection } from "mysql2/promise";
import { migratePlatformDatabase } from "./migrations.js";
import type { PlatformDatabaseConfig } from "./config.js";
import type { PlatformDatabaseSchema } from "./schema.js";

export type PlatformEventInput = {
  payload: Record<string, unknown>;
  topic: string;
  type: string;
};

export type PlatformPersistenceLifecycle = {
  recordEvent(input: PlatformEventInput): Promise<{ eventId: string; outboxId: string }>;
  start(): Promise<unknown>;
  stop(): Promise<void>;
};

export class PlatformPersistence {
  readonly database: Kysely<PlatformDatabaseSchema>;
  readonly #config: PlatformDatabaseConfig;

  constructor(config: PlatformDatabaseConfig) {
    this.#config = config;
    this.database = new Kysely<PlatformDatabaseSchema>({
      dialect: new MysqlDialect({
        pool: createPool({
          connectionLimit: config.connectionLimit,
          database: config.database,
          host: config.host,
          password: config.password,
          port: config.port,
          user: config.user,
        }),
      }),
    });
  }

  async start(): Promise<string[]> {
    await this.ensureDatabase();
    return migratePlatformDatabase(this.database);
  }

  async stop(): Promise<void> {
    await this.database.destroy();
  }

  async recordEvent(input: PlatformEventInput): Promise<{ eventId: string; outboxId: string }> {
    const eventId = randomUUID();
    const outboxId = randomUUID();
    const now = timestamp();
    const payload = JSON.stringify(input.payload);
    await this.database.transaction().execute(async (transaction) => {
      await transaction.insertInto("platform_events").values({
        created_at: now,
        event_type: input.type,
        id: eventId,
        payload,
      }).execute();
      await transaction.insertInto("platform_outbox").values({
        available_at: now,
        created_at: now,
        event_id: eventId,
        id: outboxId,
        payload,
        state: "pending",
        topic: input.topic,
        updated_at: now,
      }).execute();
    });
    return { eventId, outboxId };
  }

  private async ensureDatabase(): Promise<void> {
    const connection = await createConnection({
      host: this.#config.host,
      password: this.#config.password,
      port: this.#config.port,
      user: this.#config.user,
    });
    try {
      await connection.query(`CREATE DATABASE IF NOT EXISTS \`${this.#config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    } finally {
      await connection.end();
    }
  }
}

function timestamp(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

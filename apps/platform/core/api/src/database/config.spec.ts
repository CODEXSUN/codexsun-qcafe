import { describe, expect, it } from "vitest";
import { parseDatabaseUrl, readPersistenceEnvironment } from "./config.js";

describe("platform persistence configuration", () => {
  it("reads a MariaDB connection URL without exposing it to modules", () => {
    expect(readPersistenceEnvironment({
      DATABASE_URL: "mysql://platform:secret@db.local:3307/codexsun_platform",
      OS_DATABASE_REQUIRED: "true",
      OS_REDIS_ENABLED: "true",
      OS_REDIS_URL: "redis://cache.local:6379",
    })).toEqual({
      database: { connectionLimit: 10, database: "codexsun_platform", host: "db.local", password: "secret", port: 3307, user: "platform" },
      databaseRequired: true,
      redisUrl: "redis://cache.local:6379",
    });
  });

  it("treats blank optional values as disabled and honors the Redis switch", () => {
    expect(readPersistenceEnvironment({ DATABASE_URL: "", OS_IDENTITY_TOKEN_SECRET: "", OS_REDIS_ENABLED: "false", OS_REDIS_URL: "not-a-url" })).toEqual({ databaseRequired: false, database: undefined, identityTokenSecret: undefined, redisUrl: undefined });
    expect(() => readPersistenceEnvironment({ OS_REDIS_ENABLED: "true", OS_REDIS_URL: "" })).toThrow(/OS_REDIS_URL is required/u);
    expect(() => readPersistenceEnvironment({ OS_REDIS_ENABLED: "true", OS_REDIS_URL: "https://cache.local" })).toThrow(/redis:/u);
  });

  it("rejects non-MySQL protocols and unsafe database identifiers", () => {
    expect(() => parseDatabaseUrl("postgres://user:pass@db.local/platform")).toThrow(/mysql/u);
    expect(() => parseDatabaseUrl("mysql://user:pass@db.local/platform-name")).toThrow(/database names/u);
  });
});

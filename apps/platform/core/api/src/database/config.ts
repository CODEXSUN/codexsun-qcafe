import { z } from "zod";

const optionalValue = z.preprocess((value) => typeof value === "string" && value.trim() === "" ? undefined : value, z.string().optional());
const optionalUrl = z.preprocess((value) => typeof value === "string" && value.trim() === "" ? undefined : value, z.string().url().optional());

const environmentSchema = z.object({
  DATABASE_URL: optionalUrl,
  OS_DATABASE_REQUIRED: z.enum(["true", "false"]).optional(),
  OS_IDENTITY_TOKEN_SECRET: z.preprocess((value) => typeof value === "string" && value.trim() === "" ? undefined : value, z.string().min(32).optional()),
  OS_REDIS_ENABLED: z.enum(["true", "false"]).optional(),
  OS_REDIS_URL: optionalValue,
});

export type PlatformDatabaseConfig = {
  connectionLimit: number;
  database: string;
  host: string;
  password: string;
  port: number;
  user: string;
};

export type PlatformPersistenceEnvironment = {
  database?: PlatformDatabaseConfig;
  databaseRequired: boolean;
  redisUrl?: string;
  identityTokenSecret?: string;
};

export function readPersistenceEnvironment(environment = process.env): PlatformPersistenceEnvironment {
  const parsed = environmentSchema.parse(environment);
  const redisEnabled = parsed.OS_REDIS_ENABLED ? parsed.OS_REDIS_ENABLED === "true" : Boolean(parsed.OS_REDIS_URL);
  return {
    database: parsed.DATABASE_URL ? parseDatabaseUrl(parsed.DATABASE_URL) : undefined,
    databaseRequired: parsed.OS_DATABASE_REQUIRED === "true",
    identityTokenSecret: parsed.OS_IDENTITY_TOKEN_SECRET,
    redisUrl: redisEnabled ? requireRedisUrl(parsed.OS_REDIS_URL) : undefined,
  };
}

function requireRedisUrl(value?: string) {
  if (!value) throw new Error("OS_REDIS_URL is required when OS_REDIS_ENABLED=true.");
  const url = new URL(value);
  if (!["redis:", "rediss:"].includes(url.protocol)) throw new Error("OS_REDIS_URL must use redis: or rediss:.");
  return url.toString();
}

export function parseDatabaseUrl(value: string): PlatformDatabaseConfig {
  const url = new URL(value);
  if (url.protocol !== "mysql:" && url.protocol !== "mariadb:") {
    throw new Error("DATABASE_URL must use mysql: or mariadb:.");
  }
  const database = decodeURIComponent(url.pathname.replace(/^\//u, ""));
  if (!database) throw new Error("DATABASE_URL requires a database name.");
  if (!/^[A-Za-z0-9_]+$/u.test(database)) {
    throw new Error("DATABASE_URL database names may contain only letters, numbers, and underscores.");
  }
  const port = url.port ? Number(url.port) : 3306;
  if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error("DATABASE_URL has an invalid port.");
  return {
    connectionLimit: 10,
    database,
    host: url.hostname,
    password: decodeURIComponent(url.password),
    port,
    user: decodeURIComponent(url.username),
  };
}

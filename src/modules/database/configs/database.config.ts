import type { Knex } from "knex";
import { env } from "node:process";

const PATH_MIGRATIONS = "./migrations";
const PATH_SEEDS = "./seeds";

const base: Knex.Config = {
  client: "pg",
  connection: {
    host: env.DB_HOST ?? "localhost",
    port: Number(env.DB_PORT ?? 5433),
    user: env.DB_USER ?? "postgres",
    password: env.DB_PASSWORD ?? "postgres",
    database: env.DB_NAME ?? "monitora_auth",
  },
  pool: {
    min: Number(env.DB_POOL_MIN ?? 2),
    max: Number(env.DB_POOL_MAX ?? 10),
    acquireTimeoutMillis: Number(env.DB_ACQUIRE_TIMEOUT ?? 60_000),
  },
  migrations: {
    directory: new URL(PATH_MIGRATIONS, import.meta.url).pathname,
    extension: "ts",
    loadExtensions: [".ts"],
    tableName: "knex_migrations",
  },
  seeds: {
    directory: new URL(PATH_SEEDS, import.meta.url).pathname,
    extension: "ts",
    loadExtensions: [".ts"],
  },
};

export const development: Knex.Config = base;
export const production: Knex.Config = {
  ...base,
  pool: { ...base.pool, min: 0, max: 20 },
};

export default { development, production };

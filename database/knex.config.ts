import { existsSync } from 'node:fs';
import { env, loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';
import type { Knex } from 'knex';

const envFile = fileURLToPath(new URL('../.env', import.meta.url));
if (existsSync(envFile)) loadEnvFile(envFile);

const pool: Knex.PoolConfig = {
  min: Number(env.DB_POOL_MIN ?? 2),
  max: Number(env.DB_POOL_MAX ?? 10),
  acquireTimeoutMillis: Number(env.DB_ACQUIRE_TIMEOUT ?? 60_000),
};

export function createKnexConfig(): Knex.Config {
  return {
    client: 'pg',
    connection: {
      host: env.DB_HOST ?? 'localhost',
      port: Number(env.DB_PORT ?? 5432),
      user: env.DB_USER ?? 'postgres',
      password: env.DB_PASSWORD ?? 'postgres',
      database: env.DB_NAME ?? 'postgres',
    },
    pool,
    migrations: {
      directory: new URL('./migrations', import.meta.url).pathname,
      tableName: 'knex_migrations',
      extension: 'ts',
      loadExtensions: ['.ts'],
    },
    seeds: {
      directory: new URL('./seeds', import.meta.url).pathname,
      extension: 'ts',
      loadExtensions: ['.ts'],
    },
  };
}

export const development: Knex.Config = createKnexConfig();

export const production: Knex.Config = {
  ...development,
  pool: { ...pool, min: 0, max: 20 },
};

export default { development, production };

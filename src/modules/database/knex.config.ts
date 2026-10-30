import type { ConfigService } from '@nestjs/config';
import type { Knex } from 'knex';

const migrationsAndSeeds = {
  extension: 'ts',
  loadExtensions: ['.ts'],
};

export function createKnexConfig(config: ConfigService): Knex.Config {
  const pool: Knex.PoolConfig = {
    min: Number(config.get('DB_POOL_MIN') ?? 2),
    max: Number(config.get('DB_POOL_MAX') ?? 10),
    acquireTimeoutMillis: Number(config.get('DB_ACQUIRE_TIMEOUT') ?? 60_000),
  };

  return {
    client: 'pg',
    connection: {
      host: config.get('DB_HOST') ?? 'localhost',
      port: Number(config.get('DB_PORT') ?? 5432),
      user: config.get('DB_USER') ?? 'postgres',
      password: config.get('DB_PASSWORD') ?? 'postgres',
      database: config.get('DB_NAME') ?? 'postgres',
    },
    pool,
    migrations: {
      directory: new URL('../../../database/migrations', import.meta.url).pathname,
      tableName: 'knex_migrations',
      ...migrationsAndSeeds,
    },
    seeds: {
      directory: new URL('../../../database/seeds', import.meta.url).pathname,
      ...migrationsAndSeeds,
    },
  };
}

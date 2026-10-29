# Knex.js Setup Plan — node-transactional-outbox-with-rabbitmq

Status: **steps 1–6 applied to the codebase; not installed, not executed.**
`package.json`, `tsconfig.json`, `env.example`, `src/main.ts` and `src/database/*` were
updated/created. `pnpm install` was **not** run and no migration was executed, so
`pnpm-lock.yaml` is still out of sync with `package.json`.

Progress:

- [x] Step 1 — dependencies declared in `package.json` (install pending)
- [x] Step 2 — `env.example` filled (`.env` still missing)
- [x] Step 3 — `src/database/knexfile.ts`
- [x] Step 4 — `tsconfig.json` flags
- [x] Step 5 — `src/database/index.ts` + `src/main.ts` wired
- [x] Step 6 — `src/database/migrate.ts` + first migration file
- [ ] Step 6 — migration executed against a real Postgres
- [ ] Step 7 — outbox table and transaction path (not written yet)
- [ ] Step 8 — verification

## Context

| Item | Value |
|---|---|
| Runtime | Node 24 in this environment (`.nvmrc` asks for 26.13.0) |
| Module system | ESM (`"type": "module"`), `module: nodenext`, `target: esnext` |
| Framework | Fastify 5, single route `GET /ping` on port 9090 |
| Database | Postgres 14 (`api-db`, published as `5433:5432`, db `monitora_auth`) |
| Broker | RabbitMQ 3.13 management (`api-rabbitmq`, 5672 / 15672) |
| Package manager | pnpm 12.16.1 via corepack (`pnpm` not on PATH; `npm` fails with `EBADDEVENGINES`) |
| Types | `knex@3.3.0`, `pg@8.23.1`, `@types/pg@8.x`, `tsx@4.23.15` |

Known gaps that block a full local run: no Docker in this sandbox, and
`compose.local.yaml` references `app.Dockerfile` and `.docker/entrypoint-local.sh`,
which do not exist.

## Decisions

1. **Config lives under `src/database/`.** `.gitignore` is whitelist-only (`*` + `!src/**`),
   so a root `knexfile.ts` or root `migrations/` would be silently untracked.
2. **Migrations run programmatically**, not through the Knex CLI. The CLI loads
   `knexfile.ts` via `rechoir`/`interpret`, which expects `ts-node` in a CommonJS
   project; this package is ESM. `tsx` remains the fallback for `migrate:make`.
3. **One shared pool**, closed on Fastify `onClose`. No per-request instances.

## Steps

### 1. Install dependencies

```bash
corepack pnpm add knex pg
corepack pnpm add -D @types/pg tsx
```

`knex` bundles its types; `pg` does not. `tsx` is optional (CLI only).

- [ ] `knex` and `pg` in `dependencies`
- [ ] `@types/pg` and `tsx` in `devDependencies`

### 2. Environment variables

`env.example` is empty today. Fill it and create a local `.env` (already ignored).

```dotenv
DB_HOST=localhost
DB_PORT=5433
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=monitora_auth
DB_POOL_MIN=2
DB_POOL_MAX=10
DB_ACQUIRE_TIMEOUT=60000
DB_TIMEZONE=America/Campo_Grande
```

`5433` matches the published port in `compose.local.yaml`; from another container on
`api-network` use host `api-db` and port `5432`.

- [ ] `env.example` filled
- [ ] `.env` created locally
- [ ] `start` script loads it: `node --env-file=.env ./src/main.ts`

### 3. Knex config (`src/database/knexfile.ts`)

```ts
import type { Knex } from 'knex'
import { env } from 'node:process'

const base: Knex.Config = {
  client: 'pg',
  connection: {
    host: env.DB_HOST ?? 'localhost',
    port: Number(env.DB_PORT ?? 5433),
    user: env.DB_USER ?? 'postgres',
    password: env.DB_PASSWORD ?? 'postgres',
    database: env.DB_NAME ?? 'monitora_auth',
  },
  pool: {
    min: Number(env.DB_POOL_MIN ?? 2),
    max: Number(env.DB_POOL_MAX ?? 10),
    acquireTimeoutMillis: Number(env.DB_ACQUIRE_TIMEOUT ?? 60_000),
  },
  migrations: {
    directory: new URL('./migrations', import.meta.url).pathname,
    extension: 'ts',
    loadExtensions: ['.ts'],
    tableName: 'knex_migrations',
  },
  seeds: {
    directory: new URL('./seeds', import.meta.url).pathname,
    extension: 'ts',
    loadExtensions: ['.ts'],
  },
}

export const development: Knex.Config = base
export const production: Knex.Config = {
  ...base,
  pool: { ...base.pool, min: 0, max: 20 },
  // ssl: { rejectUnauthorized: false }, // managed / self-signed Postgres only
}

export default { development, production }
```

Notes:
- `import type` is required by `verbatimModuleSyntax`.
- `node:process` instead of the global `process`, because `tsconfig.json` has `"types": []`.
- `new URL(..., import.meta.url)` makes paths independent of `cwd`.
- After `pnpm build`, `extension`/`loadExtensions` must switch to `.js`.

- [ ] `src/database/knexfile.ts` created

### 4. `tsconfig.json` adjustments

```jsonc
{
  "compilerOptions": {
    "types": ["node"],
    "allowImportingTsExtensions": true,
    "rewriteRelativeImportExtensions": true,
    "erasableSyntaxOnly": true
  }
}
```

- `types: ["node"]` — `@types/node` is currently not loaded at all.
- The extension flags allow `from './knexfile.ts'` (required by Node type stripping)
  while `tsc` still emits `.js`.
- `erasableSyntaxOnly` guarantees no `enum`/`namespace`/parameter properties, which
  strip-only mode cannot execute.

- [ ] flags added
- [ ] `pnpm run build` still passes

### 5. Shared connection pool (`src/database/index.ts`)

```ts
import knex from 'knex'
import { development } from './knexfile.ts'

export const db = knex(development)

export async function checkDatabase(): Promise<void> {
  await db.raw('select 1')
}

export async function closeDatabase(): Promise<void> {
  await db.destroy()
}
```

Wire into `src/main.ts`:

```ts
import fastify from 'fastify'
import { checkDatabase, closeDatabase } from './database/index.ts'

const server = fastify({ logger: true })

server.addHook('onClose', async () => {
  await closeDatabase()
})

await checkDatabase()

server.get('/ping', async () => 'pong\n')

await server.listen({ port: Number(process.env.PORT ?? 9090), host: '0.0.0.0' })
```

For `server.db`, add `fastify-plugin`; a bare `decorate` inside a non-wrapped plugin
stays encapsulated and is `undefined` in routes.

- [ ] pool module created
- [ ] `main.ts` wired with `onClose` + startup check

### 6. Migrations

Create `src/database/migrations/` and a runner:

```ts
// src/database/migrate.ts
import { db } from './index.ts'

const command = process.argv[2] ?? 'latest'

try {
  if (command === 'latest') {
    const [batch, applied] = await db.migrate.latest()
    console.log(`batch ${batch}: ${applied.length} migration(s) applied`)
  } else if (command === 'rollback') {
    const [batch, reverted] = await db.migrate.rollback()
    console.log(`batch ${batch}: ${reverted.length} migration(s) reverted`)
  } else {
    console.error(`unknown command: ${command}`)
    process.exitCode = 1
  }
} finally {
  await db.destroy()
}
```

Scripts:

```json
"db:migrate": "node --env-file=.env ./src/database/migrate.ts latest",
"db:rollback": "node --env-file=.env ./src/database/migrate.ts rollback",
"db:make": "tsx ./node_modules/knex/bin/cli.js migrate:make --knexfile ./src/database/knexfile.ts"
```

Fallback if `db:make` fails: name files manually
(`20261029153000_create_productors.ts`) and use the runner.

Migration skeleton (named `up`/`down` exports are mandatory with `extension: 'ts'`):

```ts
import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('productors', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    t.string('name', 120).notNullable()
    t.string('document', 20).notNullable().unique()
    t.timestamps(true, true)
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('productors')
}
```

- [ ] `migrations/` directory
- [ ] runner script
- [ ] `package.json` scripts
- [ ] first migration applied

### 7. Transaction boundary for the outbox

```ts
await db.transaction(async (trx) => {
  const [productor] = await trx('productors')
    .insert({ name, document })
    .returning(['id', 'name', 'document'])

  await trx('outbox').insert({
    aggregate_type: 'productor',
    aggregate_id: productor.id,
    event_type: 'productor.created',
    payload: JSON.stringify(productor),
  })
})
```

Rules:
- Never publish to RabbitMQ inside the transaction (that is the dual-write the pattern prevents).
- Keep the transaction short: no HTTP, no broker `await`.
- Use `trx` for every statement; mixing `db` and `trx` takes a second connection and
  can self-deadlock under load.
- Relay batching later: `.orderBy('created_at').limit(n).forUpdate().skipLocked()`.

- [ ] business insert + outbox insert in one transaction

### 8. Verification

```bash
corepack pnpm run db:migrate
corepack pnpm exec knex --version
corepack pnpm run start
curl http://localhost:9090/ping
```

Requires a reachable Postgres. Docker is unavailable in this sandbox, and
`app.Dockerfile` / `.docker/entrypoint-local.sh` are missing, so `compose.local.yaml`
cannot build as-is.

- [ ] migrations applied against a real Postgres
- [ ] app boots and `/ping` answers
- [ ] pool closes cleanly on SIGTERM

## Risks and troubleshooting

| Symptom | Cause / fix |
|---|---|
| `ECONNREFUSED ::1:5433` | Postgres down or wrong host; in compose use `api-db:5432` |
| `Cannot find name 'process'` | `types: []` — add `"types": ["node"]` or import `node:process` |
| `Cannot find module './knexfile'` | `nodenext` + type stripping need the extension: `./knexfile.ts` |
| `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX` | `enum`/`namespace`/parameter properties — enable `erasableSyntaxOnly` |
| Knex CLI cannot load `knexfile.ts` | ESM + `rechoir` limitation — use the runner or `tsx` |
| New files untracked by git | Whitelist `.gitignore`; keep files under `src/` |
| `remaining connection slots are reserved` | Duplicate pools, or `db` used inside a `trx` callback |
| Timestamps off by hours | Set `TZ`/`PGTZ` in compose plus `pool.afterCreate` running `SET timezone` |
| `self signed certificate` | Managed Postgres: `ssl: { rejectUnauthorized: false }` |

## Out of scope

RabbitMQ publishing, outbox relay worker, retries/dead-letter, and the consumer
are not part of this plan.

import knex from 'knex'
import { development } from './configs/database.config.ts'

export const db = knex(development)

export async function checkDatabase(): Promise<void> {
  await db.raw('select 1')
}

export async function closeDatabase(): Promise<void> {
  await db.destroy()
}

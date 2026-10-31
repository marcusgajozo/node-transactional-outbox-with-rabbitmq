import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(
    `create type "OutboxEventStatus" as enum ('pending', 'in_progress', 'published', 'failed')`,
  );

  await knex.schema.createTable('outbox_productor', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('event_key', 64).notNullable();
    table.jsonb('payload').notNullable();
    table.specificType('status', '"OutboxEventStatus"').notNullable();
    table.timestamp('locked_at').nullable().defaultTo(null);
    table.string('locked_by', 128).nullable().defaultTo(null);
    table.text('failure_reason').nullable().defaultTo(null);
    table.timestamp('failed_at').nullable().defaultTo(null);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.index(
      ['status', 'created_at'],
      'outbox_productor_status_created_at_index',
    );
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('outbox_productor');
  await knex.raw('drop type if exists "OutboxEventStatus"');
}

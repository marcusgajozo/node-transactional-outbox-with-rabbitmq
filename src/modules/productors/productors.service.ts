import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { Knex } from 'knex';
import { KNEX_CONNECTION } from '../database/database.constants.js';
import type { OutboxProductorRow } from '../outbox/entities/outbox-productor.entity.js';
import type { CreateProductorDto } from './dto/create-productor.dto.js';
import type { Productor, ProductorRow } from './entities/productor.entity.js';
import { toProductor } from './entities/productor.mapper.js';

@Injectable()
export class ProductorsService {
  constructor(
    @Inject(KNEX_CONNECTION)
    private readonly knex: Knex,
  ) {}

  async create(dto: CreateProductorDto): Promise<Productor> {
    return await this.knex.transaction(async (trx) => {
      const now = new Date();
      const productorId = randomUUID();

      const [row] = await trx<ProductorRow>('productors')
        .insert({
          id: productorId,
          name: dto.name,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        })
        .returning('*');

      if (!row) {
        throw new Error('Failed to insert productor');
      }

      const createdProductor = toProductor(row);

      await trx<OutboxProductorRow>('outbox_productor').insert({
        id: randomUUID(),
        event_key: 'productor.created',
        payload: {
          id: createdProductor.id,
          name: createdProductor.name,
        },
        status: 'pending',
        locked_at: null,
        locked_by: null,
        failure_reason: null,
        failed_at: null,
        created_at: now,
      });

      return createdProductor;
    });
  }
}

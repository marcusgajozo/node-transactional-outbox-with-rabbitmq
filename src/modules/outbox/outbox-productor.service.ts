import { Inject, Injectable } from '@nestjs/common';
import type { Knex } from 'knex';
import { KNEX_CONNECTION } from '../database/database.constants.js';
import type {
  OutboxProductor,
  OutboxProductorRow,
} from './entities/outbox-productor.entity.js';
import { toOutboxProductor } from './entities/outbox-productor.mapper.js';

@Injectable()
export class OutboxProductorService {
  constructor(
    @Inject(KNEX_CONNECTION)
    private readonly knex: Knex,
  ) {}

  async findAll(): Promise<OutboxProductor[]> {
    const rows =
      await this.knex<OutboxProductorRow>('outbox_productor').select('*');
    return rows.map(toOutboxProductor);
  }
}

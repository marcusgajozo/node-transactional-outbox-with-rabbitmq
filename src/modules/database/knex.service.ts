import { Injectable, Logger, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import knex, { type Knex } from 'knex';
import { createKnexConfig } from './knex.config.js';

@Injectable()
export class KnexService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(KnexService.name);
  readonly client: Knex;

  constructor(configService: ConfigService) {
    this.client = knex(createKnexConfig(configService));
  }

  async onApplicationBootstrap(): Promise<void> {
    await this.client.raw('select 1');
    this.logger.log('Database connection established');
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.destroy();
    this.logger.log('Database pool closed');
  }
}

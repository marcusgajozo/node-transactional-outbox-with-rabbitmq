import { Global, Module } from '@nestjs/common';
import { KNEX_CONNECTION } from './database.constants.js';
import { KnexService } from './knex.service.js';

@Global()
@Module({
  providers: [
    KnexService,
    {
      provide: KNEX_CONNECTION,
      useFactory: (knexService: KnexService) => knexService.client,
      inject: [KnexService],
    },
  ],
  exports: [KNEX_CONNECTION],
})
export class DatabaseModule {}

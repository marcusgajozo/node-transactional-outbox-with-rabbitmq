import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseModule } from '../database/database.module.js';
import { ProductorsModule } from '../productors/productors.module.js';
import { OutboxProductorModule } from '../outbox/outbox-productor.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),
    DatabaseModule,
    ProductorsModule,
    OutboxProductorModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

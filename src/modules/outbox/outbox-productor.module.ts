import { Module } from '@nestjs/common';
import { OutboxProductorController } from './outbox-productor.controller.js';
import { OutboxProductorService } from './outbox-productor.service.js';

@Module({
  controllers: [OutboxProductorController],
  providers: [OutboxProductorService],
})
export class OutboxProductorModule {}

import { Global, Module } from '@nestjs/common';
import { RabbitmqPublisherService } from './rabbitmq.publisher.js';
import { RabbitmqService } from './rabbitmq.service.js';

@Global()
@Module({
  providers: [RabbitmqService, RabbitmqPublisherService],
  exports: [RabbitmqService, RabbitmqPublisherService],
})
export class RabbitmqModule {}

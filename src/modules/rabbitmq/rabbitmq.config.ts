import type { ConfigService } from '@nestjs/config';

export interface RabbitmqConfig {
  url: string;
  exchange: string;
  exchangeType: string;
}

export function createRabbitmqConfig(config: ConfigService): RabbitmqConfig {
  return {
    url: config.get('RABBITMQ_URL') ?? 'amqp://guest:guest@localhost:5672',
    exchange: config.get('RABBITMQ_EXCHANGE') ?? 'productors.events',
    exchangeType: config.get('RABBITMQ_EXCHANGE_TYPE') ?? 'topic',
  };
}

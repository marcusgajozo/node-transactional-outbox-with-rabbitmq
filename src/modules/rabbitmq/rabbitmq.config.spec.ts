import type { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';
import { createRabbitmqConfig } from './rabbitmq.config.js';

function createConfigService(values: Record<string, string>): ConfigService {
  return {
    get: (key: string) => values[key],
  } as unknown as ConfigService;
}

describe('createRabbitmqConfig', () => {
  it('returns the defaults when no environment variables are set', () => {
    const config = createRabbitmqConfig(createConfigService({}));

    expect(config).toEqual({
      url: 'amqp://guest:guest@localhost:5672',
      exchange: 'productors.events',
      exchangeType: 'topic',
    });
  });

  it('uses environment overrides', () => {
    const config = createRabbitmqConfig(
      createConfigService({
        RABBITMQ_URL: 'amqp://user:secret@rabbitmq:5672',
        RABBITMQ_EXCHANGE: 'custom.events',
        RABBITMQ_EXCHANGE_TYPE: 'direct',
      }),
    );

    expect(config).toEqual({
      url: 'amqp://user:secret@rabbitmq:5672',
      exchange: 'custom.events',
      exchangeType: 'direct',
    });
  });
});

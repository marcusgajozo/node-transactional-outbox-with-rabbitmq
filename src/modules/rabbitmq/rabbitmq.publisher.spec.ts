import { EventEmitter } from 'node:events';
import { Test, type TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RabbitmqPublisherService } from './rabbitmq.publisher.js';
import { RabbitmqService } from './rabbitmq.service.js';

class FakeConfirmChannel extends EventEmitter {
  publish = vi.fn(
    (
      _exchange: string,
      _routingKey: string,
      _content: Buffer,
      _options: unknown,
      callback?: (error: Error | null) => void,
    ): boolean => {
      callback?.(null);
      return true;
    },
  );
}

describe('RabbitmqPublisherService', () => {
  let publisher: RabbitmqPublisherService;
  let channel: FakeConfirmChannel;
  let ensureChannel: ReturnType<typeof vi.fn>;

  const exchange = 'productors.events';

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  beforeEach(async () => {
    channel = new FakeConfirmChannel();
    ensureChannel = vi.fn().mockResolvedValue(channel);

    const rabbitmqService = {
      exchange,
      ensureChannel,
    } as unknown as RabbitmqService;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RabbitmqPublisherService,
        {
          provide: RabbitmqService,
          useValue: rabbitmqService,
        },
      ],
    }).compile();

    publisher = module.get<RabbitmqPublisherService>(RabbitmqPublisherService);
  });

  it('publishes the payload through the ensured channel', async () => {
    const timestamp = new Date('2026-10-30T12:00:00.000Z');
    const payload = { id: '123', name: 'Fazenda Santa Maria' };

    await publisher.publish('productor.created', payload, {
      messageId: 'event-1',
      timestamp,
    });

    const [publishedExchange, routingKey, content, options, callback] =
      channel.publish.mock.calls[0];

    expect(ensureChannel).toHaveBeenCalledTimes(1);
    expect(publishedExchange).toBe(exchange);
    expect(routingKey).toBe('productor.created');
    expect(content).toEqual(Buffer.from(JSON.stringify(payload)));
    expect(options).toEqual({
      persistent: true,
      contentType: 'application/json',
      messageId: 'event-1',
      timestamp: Math.floor(timestamp.getTime() / 1000),
    });
    expect(callback).toEqual(expect.any(Function));
  });

  it('uses the current time when no timestamp is provided', async () => {
    const now = new Date('2026-10-31T09:30:00.000Z');
    vi.useFakeTimers({ now, toFake: ['Date'] });

    await publisher.publish(
      'productor.created',
      { id: '123' },
      {
        messageId: 'event-2',
      },
    );

    const options = channel.publish.mock.calls[0][3];

    expect(options.timestamp).toBe(Math.floor(now.getTime() / 1000));
  });

  it('resolves only after the broker confirms the message', async () => {
    let confirm: ((error: Error | null) => void) | undefined;
    channel.publish.mockImplementation(
      (
        _exchange: string,
        _routingKey: string,
        _content: Buffer,
        _options: unknown,
        callback?: (error: Error | null) => void,
      ): boolean => {
        confirm = callback;
        return true;
      },
    );

    let resolved = false;
    const publishing = publisher
      .publish('productor.created', { id: '123' }, { messageId: 'event-3' })
      .then(() => {
        resolved = true;
      });

    await vi.waitFor(() => {
      expect(confirm).toBeDefined();
    });
    expect(resolved).toBe(false);

    confirm?.(null);
    await publishing;

    expect(resolved).toBe(true);
  });

  it('rejects when the broker returns a confirm error', async () => {
    channel.publish.mockImplementation(
      (
        _exchange: string,
        _routingKey: string,
        _content: Buffer,
        _options: unknown,
        callback?: (error: Error | null) => void,
      ): boolean => {
        callback?.(new Error('broker nack'));
        return true;
      },
    );

    await expect(
      publisher.publish(
        'productor.created',
        { id: '123' },
        { messageId: 'event-4' },
      ),
    ).rejects.toThrow('broker nack');
  });

  it('rejects and skips the drain wait when publish throws synchronously', async () => {
    channel.publish.mockImplementation(() => {
      throw new Error('publish exploded');
    });

    await expect(
      publisher.publish(
        'productor.created',
        { id: '123' },
        { messageId: 'event-8' },
      ),
    ).rejects.toThrow('publish exploded');
    expect(channel.listenerCount('drain')).toBe(0);
    expect(channel.listenerCount('close')).toBe(0);
    expect(channel.listenerCount('error')).toBe(0);
  });

  it('waits for drain when the channel applies backpressure', async () => {
    channel.publish.mockImplementation(
      (
        _exchange: string,
        _routingKey: string,
        _content: Buffer,
        _options: unknown,
        callback?: (error: Error | null) => void,
      ): boolean => {
        callback?.(null);
        return false;
      },
    );

    let resolved = false;
    const publishing = publisher
      .publish('productor.created', { id: '123' }, { messageId: 'event-5' })
      .then(() => {
        resolved = true;
      });

    await vi.waitFor(() => {
      expect(channel.listenerCount('drain')).toBe(1);
    });
    expect(resolved).toBe(false);

    channel.emit('drain');
    await publishing;

    expect(resolved).toBe(true);
  });

  it('rejects when the channel closes before draining', async () => {
    channel.publish.mockImplementation(
      (
        _exchange: string,
        _routingKey: string,
        _content: Buffer,
        _options: unknown,
        callback?: (error: Error | null) => void,
      ): boolean => {
        callback?.(null);
        return false;
      },
    );

    const publishing = publisher.publish(
      'productor.created',
      { id: '123' },
      { messageId: 'event-6' },
    );

    await vi.waitFor(() => {
      expect(channel.listenerCount('close')).toBe(1);
    });

    channel.emit('close');

    await expect(publishing).rejects.toThrow(
      'RabbitMQ confirm channel closed before drain',
    );
  });

  it('rejects when the channel errors before draining', async () => {
    channel.publish.mockImplementation(
      (
        _exchange: string,
        _routingKey: string,
        _content: Buffer,
        _options: unknown,
        callback?: (error: Error | null) => void,
      ): boolean => {
        callback?.(null);
        return false;
      },
    );

    const publishing = publisher.publish(
      'productor.created',
      { id: '123' },
      { messageId: 'event-7' },
    );

    await vi.waitFor(() => {
      expect(channel.listenerCount('error')).toBe(1);
    });

    channel.emit('error', new Error('channel exploded'));

    await expect(publishing).rejects.toThrow('channel exploded');
  });
});

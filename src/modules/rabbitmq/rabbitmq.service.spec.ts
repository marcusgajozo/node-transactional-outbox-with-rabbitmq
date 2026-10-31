import { EventEmitter } from 'node:events';
import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChannelModel } from 'amqplib';
import { RabbitmqService } from './rabbitmq.service.js';

const { connectMock } = vi.hoisted(() => ({ connectMock: vi.fn() }));

vi.mock('amqplib', () => ({ connect: connectMock }));

class FakeConfirmChannel extends EventEmitter {
  assertExchange = vi.fn().mockResolvedValue({ exchange: 'productors.events' });
  close = vi.fn().mockResolvedValue(undefined);
  publish = vi.fn().mockReturnValue(true);
}

class FakeConnectionModel extends EventEmitter {
  createConfirmChannel = vi.fn<() => Promise<FakeConfirmChannel>>();
  close = vi.fn().mockResolvedValue(undefined);
}

class FakeRecoveringConnection extends FakeConnectionModel {
  waitForConnect = vi.fn<() => Promise<FakeRecoveringConnection>>();
}

function createConfigService(
  values: Record<string, string> = {},
): ConfigService {
  return {
    get: (key: string) => values[key],
  } as unknown as ConfigService;
}

describe('RabbitmqService', () => {
  let service: RabbitmqService;
  let connection: FakeRecoveringConnection;
  let model: FakeConnectionModel;
  let channel: FakeConfirmChannel;

  beforeEach(() => {
    connectMock.mockReset();

    connection = new FakeRecoveringConnection();
    connection.waitForConnect.mockResolvedValue(connection);
    model = new FakeConnectionModel();
    channel = new FakeConfirmChannel();
    model.createConfirmChannel.mockResolvedValue(channel);
    connectMock.mockResolvedValue(connection);
    service = new RabbitmqService(createConfigService());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function startService(
    target: RabbitmqService = service,
  ): Promise<(model: ChannelModel) => Promise<void>> {
    await target.onApplicationBootstrap();

    const options = connectMock.mock.calls[0][1] as {
      recovery: { setup: (model: ChannelModel) => Promise<void> };
    };

    return options.recovery.setup;
  }

  it('throws when ensuring a channel before a connection exists', async () => {
    await expect(service.ensureChannel()).rejects.toThrow(
      'RabbitMQ connection is not established yet',
    );
  });

  it('does not block bootstrap while waiting for the connection', async () => {
    connection.waitForConnect.mockReturnValue(
      new Promise<FakeRecoveringConnection>(() => undefined),
    );

    await expect(service.onApplicationBootstrap()).resolves.toBeUndefined();
    expect(connection.waitForConnect).toHaveBeenCalledTimes(1);
  });

  it('asserts the configured exchange as durable and exposes the channel', async () => {
    service = new RabbitmqService(
      createConfigService({
        RABBITMQ_EXCHANGE: 'custom.events',
        RABBITMQ_EXCHANGE_TYPE: 'direct',
      }),
    );

    const setup = await startService();
    await setup(model as unknown as ChannelModel);

    expect(model.createConfirmChannel).toHaveBeenCalledTimes(1);
    expect(channel.assertExchange).toHaveBeenCalledWith(
      'custom.events',
      'direct',
      { durable: true },
    );
    await expect(service.ensureChannel()).resolves.toBe(channel);
  });

  it('attaches recovery and channel listeners', async () => {
    const setup = await startService();
    await setup(model as unknown as ChannelModel);

    expect(connection.listenerCount('connect-failed')).toBe(1);
    expect(connection.listenerCount('reconnect-scheduled')).toBe(1);
    expect(connection.listenerCount('error')).toBe(1);
    expect(channel.listenerCount('error')).toBe(1);
    expect(channel.listenerCount('close')).toBe(1);
  });

  it('clears a closed channel and rebuilds it on the next ensureChannel', async () => {
    const log = vi.spyOn(Logger.prototype, 'log');
    const setup = await startService();
    await setup(model as unknown as ChannelModel);

    const closedChannel = await service.ensureChannel();
    const rebuiltChannel = new FakeConfirmChannel();
    model.createConfirmChannel.mockResolvedValueOnce(rebuiltChannel);

    closedChannel.emit('close');

    await expect(service.ensureChannel()).resolves.toBe(rebuiltChannel);
    expect(model.createConfirmChannel).toHaveBeenCalledTimes(2);
    expect(rebuiltChannel.assertExchange).toHaveBeenCalledWith(
      'productors.events',
      'topic',
      { durable: true },
    );
    expect(log).toHaveBeenCalledWith('RabbitMQ connection established');
    expect(log).toHaveBeenCalledWith('RabbitMQ confirm channel re-established');
    expect(
      log.mock.calls.filter(
        ([message]) => message === 'RabbitMQ connection established',
      ),
    ).toHaveLength(1);
  });

  it('logs a reconnect when setup runs on a new connection model', async () => {
    const log = vi.spyOn(Logger.prototype, 'log');
    const setup = await startService();
    await setup(model as unknown as ChannelModel);

    const reconnectModel = new FakeConnectionModel();
    const reconnectChannel = new FakeConfirmChannel();
    reconnectModel.createConfirmChannel.mockResolvedValue(reconnectChannel);

    await setup(reconnectModel as unknown as ChannelModel);

    expect(log).toHaveBeenCalledWith('RabbitMQ connection re-established');
    expect(reconnectChannel.assertExchange).toHaveBeenCalledWith(
      'productors.events',
      'topic',
      { durable: true },
    );
    expect(
      log.mock.calls.filter(
        ([message]) => message === 'RabbitMQ connection established',
      ),
    ).toHaveLength(1);
  });

  it('closes the channel before the connection on destroy', async () => {
    const setup = await startService();
    await setup(model as unknown as ChannelModel);
    const establishedChannel =
      (await service.ensureChannel()) as unknown as FakeConfirmChannel;

    await service.onModuleDestroy();

    expect(establishedChannel.close).toHaveBeenCalledTimes(1);
    expect(connection.close).toHaveBeenCalledTimes(1);
    expect(establishedChannel.close.mock.invocationCallOrder[0]).toBeLessThan(
      connection.close.mock.invocationCallOrder[0],
    );
  });

  it('does not store a channel created during shutdown', async () => {
    const setup = await startService();
    await setup(model as unknown as ChannelModel);
    await service.onModuleDestroy();

    const lateChannel = new FakeConfirmChannel();
    const lateModel = new FakeConnectionModel();
    lateModel.createConfirmChannel.mockResolvedValue(lateChannel);

    await setup(lateModel as unknown as ChannelModel);

    expect(lateChannel.close).toHaveBeenCalledTimes(1);
    await expect(service.ensureChannel()).rejects.toThrow(
      'RabbitMQ service is shutting down',
    );
  });
});

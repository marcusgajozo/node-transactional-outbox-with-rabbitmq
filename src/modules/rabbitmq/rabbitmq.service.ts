import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  connect,
  type ChannelModel,
  type ConfirmChannel,
  type RecoveringChannelModel,
} from 'amqplib';
import {
  createRabbitmqConfig,
  type RabbitmqConfig,
} from './rabbitmq.config.js';

@Injectable()
export class RabbitmqService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(RabbitmqService.name);
  private readonly config: RabbitmqConfig;
  private recoveringConnection: RecoveringChannelModel | undefined;
  private currentConnection: ChannelModel | undefined;
  private confirmChannel: ConfirmChannel | undefined;
  private channelSetup: Promise<ConfirmChannel | undefined> | undefined;
  private hasEstablishedConnection = false;
  private closing = false;

  constructor(configService: ConfigService) {
    this.config = createRabbitmqConfig(configService);
  }

  get exchange(): string {
    return this.config.exchange;
  }

  async ensureChannel(): Promise<ConfirmChannel> {
    if (this.closing) {
      throw new Error('RabbitMQ service is shutting down');
    }

    if (this.confirmChannel) {
      return this.confirmChannel;
    }

    const connection = this.currentConnection;

    if (!connection) {
      throw new Error('RabbitMQ connection is not established yet');
    }

    if (!this.channelSetup) {
      this.channelSetup = this.setupConnection(connection).finally(() => {
        this.channelSetup = undefined;
      });
    }

    const channel = await this.channelSetup;

    if (!channel) {
      throw new Error('RabbitMQ service is shutting down');
    }

    return channel;
  }

  async onApplicationBootstrap(): Promise<void> {
    const connection = await connect(this.config.url, {
      recovery: {
        initialDelay: 1_000,
        maxDelay: 30_000,
        factor: 2,
        jitter: 0.2,
        maxRetries: Infinity,
        waitForConnect: false,
        setup: async (model: ChannelModel) => {
          await this.setupConnection(model);
        },
      },
    });

    this.recoveringConnection = connection;
    this.registerEventHandlers(connection);

    void connection
      .waitForConnect()
      .then(() => {
        this.logger.log('RabbitMQ connection ready');
      })
      .catch((error: Error) => {
        this.logger.error(`RabbitMQ connection failed: ${error.message}`);
      });
  }

  async onModuleDestroy(): Promise<void> {
    this.closing = true;
    await this.closeConfirmChannel();

    if (this.recoveringConnection) {
      try {
        await this.recoveringConnection.close();
      } catch (error) {
        this.logger.warn(`RabbitMQ connection close skipped: ${String(error)}`);
      }
      this.recoveringConnection = undefined;
    }

    this.currentConnection = undefined;
    this.logger.log('RabbitMQ connection closed');
  }

  private async setupConnection(
    model: ChannelModel,
  ): Promise<ConfirmChannel | undefined> {
    const channel = await model.createConfirmChannel();
    this.registerChannelHandlers(channel);

    if (this.closing) {
      await this.closeChannelIgnoringErrors(channel);
      return undefined;
    }

    await channel.assertExchange(
      this.config.exchange,
      this.config.exchangeType,
      {
        durable: true,
      },
    );

    if (this.closing) {
      await this.closeChannelIgnoringErrors(channel);
      return undefined;
    }

    const previousChannel = this.confirmChannel;
    const isSameConnection = this.currentConnection === model;
    const isFirstSetup = !this.hasEstablishedConnection;

    this.currentConnection = model;
    this.confirmChannel = channel;
    this.hasEstablishedConnection = true;

    if (previousChannel && previousChannel !== channel) {
      await this.closeChannelIgnoringErrors(previousChannel);
    }

    if (isFirstSetup) {
      this.logger.log('RabbitMQ connection established');
    } else if (isSameConnection) {
      this.logger.log('RabbitMQ confirm channel re-established');
    } else {
      this.logger.log('RabbitMQ connection re-established');
    }

    return channel;
  }

  private registerEventHandlers(connection: RecoveringChannelModel): void {
    connection.on('connect-failed', (error) => {
      this.logger.error(`RabbitMQ connect-failed: ${error.message}`);
    });

    connection.on('reconnect-scheduled', ({ attempt, delay, error }) => {
      this.logger.warn(
        `RabbitMQ reconnect-scheduled: attempt ${attempt} in ${delay}ms (${error.message})`,
      );
    });

    connection.on('error', (error) => {
      this.logger.error(`RabbitMQ connection error: ${error.message}`);
    });
  }

  private registerChannelHandlers(channel: ConfirmChannel): void {
    channel.on('error', (error) => {
      this.logger.warn(`RabbitMQ confirm channel error: ${error.message}`);
    });

    channel.on('close', () => {
      this.logger.warn('RabbitMQ confirm channel closed');

      if (!this.closing && this.confirmChannel === channel) {
        this.confirmChannel = undefined;
      }
    });
  }

  private async closeConfirmChannel(): Promise<void> {
    if (!this.confirmChannel) {
      return;
    }

    const channel = this.confirmChannel;
    this.confirmChannel = undefined;
    await this.closeChannelIgnoringErrors(channel);
  }

  private async closeChannelIgnoringErrors(
    channel: ConfirmChannel,
  ): Promise<void> {
    try {
      await channel.close();
    } catch (error) {
      this.logger.warn(`RabbitMQ channel close skipped: ${String(error)}`);
    }
  }
}

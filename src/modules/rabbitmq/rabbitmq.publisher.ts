import { Injectable } from '@nestjs/common';
import type { ConfirmChannel } from 'amqplib';
import { RabbitmqService } from './rabbitmq.service.js';

@Injectable()
export class RabbitmqPublisherService {
  constructor(private readonly rabbitmqService: RabbitmqService) {}

  async publish(
    routingKey: string,
    payload: unknown,
    options: { messageId: string; timestamp?: Date },
  ): Promise<void> {
    const channel = await this.rabbitmqService.ensureChannel();
    const timestamp = options.timestamp ?? new Date();
    let published = false;
    let publishThrew = false;

    const confirmed = new Promise<void>((resolve, reject) => {
      try {
        published = channel.publish(
          this.rabbitmqService.exchange,
          routingKey,
          Buffer.from(JSON.stringify(payload)),
          {
            persistent: true,
            contentType: 'application/json',
            messageId: options.messageId,
            timestamp: Math.floor(timestamp.getTime() / 1000),
          },
          (error) => {
            if (error) {
              reject(error);
              return;
            }

            resolve();
          },
        );
      } catch (error) {
        publishThrew = true;
        reject(error);
      }
    });

    const drain =
      published || publishThrew
        ? Promise.resolve()
        : this.waitForDrain(channel);
    await Promise.all([confirmed, drain]);
  }

  private waitForDrain(channel: ConfirmChannel): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const onDrain = (): void => {
        cleanup();
        resolve();
      };

      const onClose = (): void => {
        cleanup();
        reject(new Error('RabbitMQ confirm channel closed before drain'));
      };

      const onError = (error: Error): void => {
        cleanup();
        reject(error);
      };

      const cleanup = (): void => {
        channel.removeListener('drain', onDrain);
        channel.removeListener('close', onClose);
        channel.removeListener('error', onError);
      };

      channel.once('drain', onDrain);
      channel.once('close', onClose);
      channel.once('error', onError);
    });
  }
}

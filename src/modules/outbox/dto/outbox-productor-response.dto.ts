import { ApiProperty } from '@nestjs/swagger';
import {
  OUTBOX_EVENT_STATUSES,
  type OutboxEventStatus,
} from '../entities/outbox-productor.entity.js';

export class OutboxProductorResponseDto {
  @ApiProperty({
    description: 'Outbox event unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiProperty({
    description: 'Outbox event key',
    example: 'productor.created',
    maxLength: 64,
  })
  eventKey!: string;

  @ApiProperty({
    description: 'Outbox event payload',
    type: 'object',
    additionalProperties: true,
    example: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Fazenda Santa Maria',
    },
  })
  payload!: Record<string, unknown>;

  @ApiProperty({
    description: 'Outbox event processing status',
    enum: OUTBOX_EVENT_STATUSES,
    example: 'pending',
  })
  status!: OutboxEventStatus;

  @ApiProperty({
    description: 'Timestamp when the event was locked for processing',
    type: String,
    format: 'date-time',
    example: '2026-10-31T12:05:00.000Z',
    nullable: true,
  })
  lockedAt!: Date | null;

  @ApiProperty({
    description: 'Identifier of the worker that locked the event',
    type: String,
    maxLength: 128,
    example: 'worker-1',
    nullable: true,
  })
  lockedBy!: string | null;

  @ApiProperty({
    description: 'Reason the event failed to publish',
    type: String,
    example: 'RabbitMQ connection lost',
    nullable: true,
  })
  failureReason!: string | null;

  @ApiProperty({
    description: 'Timestamp when the event failed to publish',
    type: String,
    format: 'date-time',
    example: '2026-10-31T12:10:00.000Z',
    nullable: true,
  })
  failedAt!: Date | null;

  @ApiProperty({
    description: 'Outbox event creation timestamp',
    example: '2026-10-31T12:00:00.000Z',
  })
  createdAt!: Date;
}

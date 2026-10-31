import type {
  OutboxProductor,
  OutboxProductorRow,
} from './outbox-productor.entity.js';

export function toOutboxProductor(row: OutboxProductorRow): OutboxProductor {
  return {
    id: row.id,
    eventKey: row.event_key,
    payload: row.payload,
    status: row.status,
    lockedAt: row.locked_at,
    lockedBy: row.locked_by,
    failureReason: row.failure_reason,
    failedAt: row.failed_at,
    createdAt: row.created_at,
  };
}

export function toOutboxProductorRow(
  event: OutboxProductor,
): OutboxProductorRow {
  return {
    id: event.id,
    event_key: event.eventKey,
    payload: event.payload,
    status: event.status,
    locked_at: event.lockedAt,
    locked_by: event.lockedBy,
    failure_reason: event.failureReason,
    failed_at: event.failedAt,
    created_at: event.createdAt,
  };
}

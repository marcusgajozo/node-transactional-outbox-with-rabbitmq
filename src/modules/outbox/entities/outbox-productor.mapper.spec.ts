import {
  toOutboxProductor,
  toOutboxProductorRow,
} from './outbox-productor.mapper.js';
import type { OutboxProductorRow } from './outbox-productor.entity.js';

describe('outbox productor mapper', () => {
  const row: OutboxProductorRow = {
    id: '0192f5a0-0000-7000-8000-000000000002',
    event_key: 'productor.created',
    payload: { productorId: '0192f5a0-0000-7000-8000-000000000001' },
    status: 'pending',
    locked_at: null,
    locked_by: null,
    failure_reason: null,
    failed_at: null,
    created_at: new Date('2026-10-31T12:00:00.000Z'),
  };

  it('maps a row to an outbox productor', () => {
    expect(toOutboxProductor(row)).toEqual({
      id: row.id,
      eventKey: row.event_key,
      payload: row.payload,
      status: row.status,
      lockedAt: row.locked_at,
      lockedBy: row.locked_by,
      failureReason: row.failure_reason,
      failedAt: row.failed_at,
      createdAt: row.created_at,
    });
  });

  it('round-trips a row through the domain type', () => {
    expect(toOutboxProductorRow(toOutboxProductor(row))).toEqual(row);
  });

  it('preserves null lock and failure fields through the round trip', () => {
    const roundTripped = toOutboxProductorRow(toOutboxProductor(row));

    expect(roundTripped.locked_at).toBeNull();
    expect(roundTripped.locked_by).toBeNull();
    expect(roundTripped.failure_reason).toBeNull();
    expect(roundTripped.failed_at).toBeNull();
  });

  it('round-trips a row with lock and failure data', () => {
    const failedRow: OutboxProductorRow = {
      ...row,
      status: 'failed',
      locked_at: new Date('2026-10-31T12:05:00.000Z'),
      locked_by: 'worker-1',
      failure_reason: 'broker unavailable',
      failed_at: new Date('2026-10-31T12:06:00.000Z'),
    };

    expect(toOutboxProductorRow(toOutboxProductor(failedRow))).toEqual(
      failedRow,
    );
  });
});

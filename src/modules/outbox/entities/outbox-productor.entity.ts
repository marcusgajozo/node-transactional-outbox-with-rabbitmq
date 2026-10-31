export const OUTBOX_EVENT_STATUSES = [
  'pending',
  'in_progress',
  'published',
  'failed',
] as const;

export type OutboxEventStatus = (typeof OUTBOX_EVENT_STATUSES)[number];

export type OutboxProductor = {
  id: string;
  eventKey: string;
  payload: Record<string, unknown>;
  status: OutboxEventStatus;
  lockedAt: Date | null;
  lockedBy: string | null;
  failureReason: string | null;
  failedAt: Date | null;
  createdAt: Date;
};

export type OutboxProductorRow = {
  id: string;
  event_key: string;
  payload: Record<string, unknown>;
  status: OutboxEventStatus;
  locked_at: Date | null;
  locked_by: string | null;
  failure_reason: string | null;
  failed_at: Date | null;
  created_at: Date;
};

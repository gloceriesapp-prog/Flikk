// Customer push outbox (customer_notifications, migrations 067 + 117) as the
// admin sees it. The backend worker (backend/src/notifications/worker.ts)
// claims unsent rows, sends them through Expo and either sets push_sent_at or
// schedules a retry; after 6 attempts a row stays unsent ("failed") until an
// admin retries it. last_error says why the last attempt did not go out.

export type OutboxStatus = 'queued' | 'sent' | 'no_device' | 'failed';
export const OUTBOX_STATUSES: OutboxStatus[] = ['queued', 'failed', 'sent', 'no_device'];
export const MAX_PUSH_ATTEMPTS = 6;

export const OUTBOX_STATUS_LABEL: Record<OutboxStatus, string> = {
  queued: 'Queued / retrying',
  failed: 'Failed',
  sent: 'Sent',
  no_device: 'No device',
};

export function outboxStatus(row: { push_sent_at: string | null; attempts: number; last_error: string | null }): OutboxStatus {
  if (row.push_sent_at) return row.last_error ? 'no_device' : 'sent';
  return row.attempts >= MAX_PUSH_ATTEMPTS ? 'failed' : 'queued';
}

export function isOutboxStatus(value: unknown): value is OutboxStatus {
  return typeof value === 'string' && (OUTBOX_STATUSES as string[]).includes(value);
}

export const TEMPLATE_EVENT_LABEL: Record<string, string> = {
  placed: 'Order placed',
  packed: 'Order packed',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  failed: 'Delivery failed',
};

// Errcodes from the migration 117 RPCs: messages are written for the admin.
export function controlRpcStatus(code: string | undefined): number | null {
  if (code === 'P0404') return 404;
  if (code === 'P0409') return 409;
  if (code === 'P0422') return 400;
  if (code === 'P0429') return 429;
  return null;
}

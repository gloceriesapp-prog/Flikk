// Customer push outbox for admin: queued / failed / sent rows with the last
// error, newest first, plus per-status counts. Read-only; retry is
// ./[id]/retry. See lib/pushOutbox.ts for the status rules.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { MAX_PUSH_ATTEMPTS, OUTBOX_STATUSES, isOutboxStatus, outboxStatus, type OutboxStatus } from '@/lib/pushOutbox';

const SELECT = 'id, customer_id, order_id, trip_id, admin_message_id, event, title, body, created_at, push_sent_at, attempts, next_attempt_at, last_error, users(name, phone)';

// PostgREST filter builder narrowed to what applyStatus needs.
interface Filterable<T> {
  is(column: string, value: null): T;
  not(column: string, op: string, value: null): T;
  gte(column: string, value: number): T;
  lt(column: string, value: number): T;
}

function applyStatus<T extends Filterable<T>>(query: T, status: OutboxStatus): T {
  if (status === 'sent') return query.not('push_sent_at', 'is', null).is('last_error', null);
  if (status === 'no_device') return query.not('push_sent_at', 'is', null).not('last_error', 'is', null);
  if (status === 'failed') return query.is('push_sent_at', null).gte('attempts', MAX_PUSH_ATTEMPTS);
  return query.is('push_sent_at', null).lt('attempts', MAX_PUSH_ATTEMPTS);
}

export async function GET(request: Request) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const param = new URL(request.url).searchParams.get('status');
  const status: OutboxStatus = isOutboxStatus(param) ? param : 'failed';

  try {
    const counts = await Promise.all(
      OUTBOX_STATUSES.map(async (s) => {
        const { count, error } = await applyStatus(supabaseAdmin.from('customer_notifications').select('id', { count: 'exact', head: true }), s);
        if (error) throw error;
        return [s, count ?? 0] as const;
      }),
    );
    const { data, error } = await applyStatus(supabaseAdmin.from('customer_notifications').select(SELECT), status)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    return NextResponse.json({
      status,
      counts: Object.fromEntries(counts),
      rows: (data ?? []).map((r) => {
        const customer = r.users as unknown as { name: string | null; phone: string } | null;
        return {
          id: r.id,
          customerId: r.customer_id,
          customerLabel: customer ? customer.name ?? customer.phone : 'Unknown customer',
          orderId: r.order_id,
          tripId: r.trip_id,
          kind: r.admin_message_id ? 'admin' : 'order',
          event: r.event,
          title: r.title,
          body: r.body,
          createdAt: r.created_at,
          sentAt: r.push_sent_at,
          attempts: r.attempts,
          nextAttemptAt: r.next_attempt_at,
          lastError: r.last_error,
          status: outboxStatus(r),
        };
      }),
    });
  } catch {
    return NextResponse.json({ error: 'Could not load the push outbox. Apply migration 117 if this is a new database.' }, { status: 500 });
  }
}

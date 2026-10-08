// Stuck checkouts and payments, read-only. "Stuck" = older than ?minutes=N
// (default 30, 5..1440):
// - unpaid online checkouts: orders/trips still 'placed' with no recorded
//   payment. The expiry worker normally releases them 20 minutes after
//   placement (50 minutes at most while a Cashfree order is being
//   reconciled), so anything older means the worker or provider check is
//   stuck. Actions: open the order (admin cancel lives there).
// - refunds not completed: order_refund_jobs / trip_refunds still queued,
//   processing, failed or manual_required. Actions: the existing retry
//   (/api/orders/[id]/retry-refund) and manual-refund flows on Refunds.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdminActor } from '@/lib/orders/adminActor';

function stuckMinutes(raw: string | null): number {
  const n = Number(raw ?? 30);
  return Number.isInteger(n) && n >= 5 && n <= 1440 ? n : 30;
}

export async function GET(request: Request) {
  const { denied } = await requireAdminActor();
  if (denied) return denied;
  const minutes = stuckMinutes(new URL(request.url).searchParams.get('minutes'));
  const cutoff = new Date(Date.now() - minutes * 60_000).toISOString();

  try {
    const [ordersRes, tripsRes, orderRefundsRes, tripRefundsRes] = await Promise.all([
      supabaseAdmin
        .from('orders')
        .select('id, order_number, total, placed_at, customer_id, users!customer_id(name, phone)')
        .is('trip_id', null)
        .eq('status', 'placed')
        .eq('payment_method', 'online')
        .is('provider_payment_id', null)
        .lt('placed_at', cutoff)
        .order('placed_at', { ascending: true })
        .limit(100),
      supabaseAdmin
        .from('trips')
        .select('id, total, created_at, customer_id, users!customer_id(name, phone)')
        .eq('status', 'placed')
        .is('provider_payment_id', null)
        .lt('created_at', cutoff)
        .order('created_at', { ascending: true })
        .limit(100),
      supabaseAdmin
        .from('order_refund_jobs')
        .select('order_id, status, attempts, last_error, target_paise, created_at, updated_at, orders(order_number)')
        .in('status', ['queued', 'processing', 'failed', 'manual_required'])
        .lt('created_at', cutoff)
        .order('created_at', { ascending: true })
        .limit(100),
      supabaseAdmin
        .from('trip_refunds')
        .select('trip_id, status, attempts, last_error, target_paise, updated_at')
        .in('status', ['queued', 'processing', 'failed', 'manual_required'])
        .lt('updated_at', cutoff)
        .order('updated_at', { ascending: true })
        .limit(100),
    ]);
    for (const res of [ordersRes, tripsRes, orderRefundsRes, tripRefundsRes]) if (res.error) throw res.error;

    // Legs fetched separately: trips and orders are linked by more than one foreign key.
    const tripIds = (tripsRes.data ?? []).map((t) => t.id);
    const { data: legRows, error: legError } = tripIds.length
      ? await supabaseAdmin.from('orders').select('id, trip_id, order_number, payment_method').in('trip_id', tripIds)
      : { data: [], error: null };
    if (legError) throw legError;
    const legsOf = (tripId: string) => (legRows ?? []).filter((l) => l.trip_id === tripId);

    const ids = [...(ordersRes.data ?? []).map((o) => ({ kind: 'order', id: o.id })), ...(tripsRes.data ?? []).map((t) => ({ kind: 'trip', id: t.id }))];
    const { data: sessions, error: sessionsError } = ids.length
      ? await supabaseAdmin
          .from('checkout_payment_sessions')
          .select('kind, target_id, provider_order_id, reconcile_state, expiry_checked_at')
          .in('target_id', ids.map((i) => i.id))
      : { data: [], error: null };
    if (sessionsError) throw sessionsError;
    const session = (kind: string, id: string) => (sessions ?? []).find((s) => s.kind === kind && s.target_id === id) ?? null;
    const who = (u: unknown) => {
      const user = u as { name: string | null; phone: string } | null;
      return user ? user.name ?? user.phone : 'Unknown customer';
    };

    const checkouts = [
      ...(ordersRes.data ?? []).map((o) => ({
        kind: 'order' as const,
        id: o.id,
        reference: o.order_number,
        orderId: o.id,
        customerId: o.customer_id,
        customer: who(o.users),
        total: Number(o.total),
        since: o.placed_at,
        providerOrderId: session('order', o.id)?.provider_order_id ?? null,
        providerChecked: !!session('order', o.id)?.expiry_checked_at,
      })),
      ...(tripsRes.data ?? [])
        .filter((t) => legsOf(t.id).some((leg) => leg.payment_method === 'online'))
        .map((t) => {
          const legs = legsOf(t.id);
          return {
            kind: 'trip' as const,
            id: t.id,
            reference: legs.map((l) => l.order_number).join(', '),
            orderId: legs[0]?.id ?? null,
            customerId: t.customer_id,
            customer: who(t.users),
            total: Number(t.total),
            since: t.created_at,
            providerOrderId: session('trip', t.id)?.provider_order_id ?? null,
            providerChecked: !!session('trip', t.id)?.expiry_checked_at,
          };
        }),
    ].sort((a, b) => a.since.localeCompare(b.since));

    const refunds = [
      ...(orderRefundsRes.data ?? []).map((r) => ({
        kind: 'order' as const,
        id: r.order_id,
        reference: (r.orders as unknown as { order_number: string } | null)?.order_number ?? r.order_id,
        status: r.status,
        attempts: r.attempts,
        lastError: r.last_error,
        amount: Number(r.target_paise) / 100,
        since: r.created_at,
      })),
      ...(tripRefundsRes.data ?? []).map((r) => ({
        kind: 'trip' as const,
        id: r.trip_id,
        reference: r.trip_id,
        status: r.status,
        attempts: r.attempts,
        lastError: r.last_error,
        amount: Number(r.target_paise) / 100,
        since: r.updated_at,
      })),
    ].sort((a, b) => a.since.localeCompare(b.since));

    return NextResponse.json({ minutes, checkouts, refunds });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load stuck payments.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

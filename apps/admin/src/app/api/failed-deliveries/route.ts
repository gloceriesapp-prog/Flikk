// Failed-delivery manual-refund review — every order the rider marked 'failed'
// AFTER pickup (backend order state machine: out_for_delivery -> failed). The
// customer paid at checkout but is NOT auto-refunded; policy is case-by-case
// admin review, so this is the founder's queue for it. Service role, same
// rationale as sibling routes (orders has no admin-usable RLS read policy).
//
// Deliberately separate from /api/refunds: that route lists orders whose
// refund_status is already non-'none' and its 'failed' means "the provider
// refund failed" — a different meaning from a failed delivery. Once a refund
// IS issued here, the order's refund_status moves off 'none' and it also
// starts showing in the Refunds tab (where a failed refund gets its Retry and
// a 'manual_required' one gets "Mark refunded manually") — so no retry logic
// is duplicated here.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdminSession } from '@/lib/supabase/server';
import { deliveryFailureReasonLabel } from '@/lib/orders/deliveryFailureReasons';
import type { RefundStatus } from '@/lib/types';

export interface FailedDeliveryOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  storeName: string;
  amount: number;
  reasonCode: string | null;
  reasonLabel: string;
  // No failed_at column exists (migration 052 deliberately added none) — this
  // is when the order was placed, the only timestamp available.
  placedAt: string;
  // 'none' => still refundable; anything else => a refund was already issued.
  refundStatus: RefundStatus;
  refundedAt: string | null;
}

interface FailedOrderRow {
  id: string;
  order_number: string;
  customer_id: string;
  total: number;
  cancel_reason: string | null;
  placed_at: string;
  refund_status: FailedDeliveryOrder['refundStatus'];
  refunded_at: string | null;
  stores: { name: string } | null;
}

export async function GET() {
  const user = await requireAdminSession();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  try {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('id, order_number, customer_id, total, cancel_reason, placed_at, refund_status, refunded_at, stores(name)')
      .eq('status', 'failed')
      .order('placed_at', { ascending: false });
    if (error) throw error;

    const rows = (data ?? []) as unknown as FailedOrderRow[];

    // Resolve customer name/phone in one batch query — same two-step pattern as
    // app/api/customers/route.ts, avoids embedding ambiguity on orders' user FK.
    const customerIds = [...new Set(rows.map((r) => r.customer_id))];
    const { data: users, error: usersErr } = customerIds.length
      ? await supabaseAdmin.from('users').select('id, name, phone').in('id', customerIds)
      : { data: [], error: null };
    if (usersErr) throw usersErr;
    const byId = new Map((users ?? []).map((u) => [u.id, u]));

    const orders: FailedDeliveryOrder[] = rows.map((row) => ({
      id: row.id,
      orderNumber: row.order_number,
      customerName: byId.get(row.customer_id)?.name ?? 'Unknown',
      customerPhone: byId.get(row.customer_id)?.phone ?? '—',
      storeName: row.stores?.name ?? 'Unknown store',
      amount: Number(row.total),
      reasonCode: row.cancel_reason,
      reasonLabel: deliveryFailureReasonLabel(row.cancel_reason),
      placedAt: row.placed_at,
      refundStatus: row.refund_status,
      refundedAt: row.refunded_at,
    }));

    return NextResponse.json(orders);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load failed deliveries.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

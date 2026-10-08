// Admin forward status change — admin_advance_order_status (migration 109).
// Only placed -> packed and packed -> out_for_delivery (with a rider), the
// forward steps of backend/src/lib/orderStateMachine.ts a store or rider app
// could fail to send. guard_checkout_order still refuses an unpaid online
// order and a trip pickup beside an unpacked shop. Delivery completion is not
// offered: it stays code-verified (reissue the delivery code instead).
// A newly packed order is picked up by the worker's dispatch pass
// (advance_dispatch_offers), the same recovery path as a missed dispatch.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { adminReason, adminRpcErrorResponse, isUuid, requireAdminActor } from '@/lib/orders/adminActor';

const ALLOWED_TARGETS = new Set(['packed', 'out_for_delivery']);

export async function POST(request: Request, ctx: RouteContext<'/api/orders/[id]/status'>) {
  const { actor, denied } = await requireAdminActor();
  if (denied) return denied;
  const { id } = await ctx.params;
  if (!isUuid(id)) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  const body = (await request.json().catch(() => null)) as { to?: unknown; reason?: unknown } | null;
  if (typeof body?.to !== 'string' || !ALLOWED_TARGETS.has(body.to)) {
    return NextResponse.json({ error: 'Admin can only mark an order packed or picked up.' }, { status: 400 });
  }
  const reason = adminReason(body.reason);
  if (!reason) return NextResponse.json({ error: 'Enter a reason (3-300 characters).' }, { status: 400 });

  try {
    const { data, error } = await supabaseAdmin.rpc('admin_advance_order_status', { p_order: id, p_to: body.to, p_reason: reason, p_admin_email: actor.email });
    if (error) {
      const mapped = adminRpcErrorResponse(error);
      if (mapped) return mapped;
      throw error;
    }
    return NextResponse.json({ status: (data as { status: string }).status });
  } catch (err) {
    console.error('Admin status change failed', { code: (err as { code?: string } | null)?.code });
    return NextResponse.json({ error: 'Could not change the status. Please try again.' }, { status: 500 });
  }
}

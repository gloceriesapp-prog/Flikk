// Mark or clear a customer complaint on an order (orders.complaint_reported_at,
// migration 20261127090000). Customer care runs by email; this records that
// the customer complained about this order (missing items, damage, a bad
// delivery) so the customer app never asks them for a store review about it.
// Body: { reported: boolean, reason: string }. Audited in admin_order_actions.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { adminReason, isUuid, rpcErrorCode } from '@/lib/orders/adminActor';

// Column or audit action not there yet: the migration hasn't been applied.
const MIGRATION_PENDING = new Set(['42703', 'PGRST204', '23514']);

export async function POST(request: Request, ctx: RouteContext<'/api/orders/[id]/complaint'>) {
  const { actor, denied } = await requireAdmin();
  if (denied) return denied;
  const { id } = await ctx.params;
  if (!isUuid(id)) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  const body = (await request.json().catch(() => null)) as { reported?: unknown; reason?: unknown } | null;
  const reason = adminReason(body?.reason);
  if (typeof body?.reported !== 'boolean') return NextResponse.json({ error: 'Choose mark or clear.' }, { status: 400 });
  if (!reason) return NextResponse.json({ error: 'Enter a reason (at least 3 characters).' }, { status: 400 });

  try {
    const { data, error } = await supabaseAdmin.from('orders')
      .update({ complaint_reported_at: body.reported ? new Date().toISOString() : null })
      .eq('id', id).select('id, complaint_reported_at').maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    // ponytail: two writes, not one transaction; a failed audit row is logged,
    // the flag stays. Move both into an RPC if the audit must be atomic.
    const { error: auditError } = await supabaseAdmin.from('admin_order_actions').insert({
      order_id: id, action: body.reported ? 'mark_complaint' : 'clear_complaint',
      from_value: body.reported ? null : 'complaint', to_value: body.reported ? 'complaint' : null,
      reason, admin_email: actor.email,
    });
    if (auditError) console.error('Complaint audit failed', { code: auditError.code });
    return NextResponse.json({ reportedAt: data.complaint_reported_at });
  } catch (err) {
    const code = rpcErrorCode(err);
    if (code && MIGRATION_PENDING.has(code)) {
      return NextResponse.json({ error: 'Complaint tracking needs the order complaints database update first.' }, { status: 503 });
    }
    console.error('Complaint update failed', { code });
    return NextResponse.json({ error: 'Could not update the complaint.' }, { status: 500 });
  }
}

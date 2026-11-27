// Payment gateway for NEW online checkouts (platform_settings, migration
// 20261128090000): razorpay (default) | cashfree | split with a percent. The
// backend reads it per new checkout (backend/src/payments/gateway.ts); a
// checkout keeps the gateway it started on, and only app builds with the
// Cashfree SDK can be routed to Cashfree. Writes go through
// admin_update_payment_gateway (20261128100000), audited.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { adminRpcErrorResponse } from '@/lib/orders/adminActor';

const MODES = ['razorpay', 'cashfree', 'split'] as const;
type Mode = (typeof MODES)[number];

export async function GET() {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  try {
    const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const [settingsRes, auditRes, recentRes] = await Promise.all([
      supabaseAdmin.from('platform_settings').select('payment_gateway, payment_gateway_split_pct').limit(1).single(),
      supabaseAdmin.from('admin_control_audit').select('id, detail, admin_email, created_at')
        .eq('action', 'payment_gateway_update').order('created_at', { ascending: false }).limit(10),
      // Last 7 days of online checkouts by gateway (and fallbacks) for the rollout.
      supabaseAdmin.from('admin_payment_reconciliation').select('payment_provider, fallback_from, provider_payment_id').gte('created_at', since).limit(5000),
    ]);
    if (settingsRes.error) throw settingsRes.error;
    if (auditRes.error) throw auditRes.error;
    if (recentRes.error) throw recentRes.error;
    const row = settingsRes.data as { payment_gateway: Mode; payment_gateway_split_pct: number };
    const stats = { razorpay: { started: 0, paid: 0 }, cashfree: { started: 0, paid: 0 }, fallbacks: 0 };
    for (const r of recentRes.data ?? []) {
      const side = r.payment_provider === 'cashfree' ? stats.cashfree : stats.razorpay;
      side.started += 1; if (r.provider_payment_id) side.paid += 1;
      if (r.fallback_from) stats.fallbacks += 1;
    }
    return NextResponse.json({
      mode: row.payment_gateway, splitPercent: row.payment_gateway_split_pct, last7Days: stats,
      history: (auditRes.data ?? []).map((a) => ({ id: a.id, detail: a.detail, adminEmail: a.admin_email, createdAt: a.created_at })),
    });
  } catch {
    return NextResponse.json({ error: 'Could not load the payment gateway. Apply migrations 20261128090000 and 20261128100000.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const { actor, denied } = await requireAdmin();
  if (denied) return denied;
  const body = (await request.json().catch(() => null)) as { mode?: unknown; splitPercent?: unknown } | null;
  const splitPercent = Number(body?.splitPercent ?? 0);
  if (!MODES.includes(body?.mode as Mode) || !Number.isInteger(splitPercent) || splitPercent < 0 || splitPercent > 100) {
    return NextResponse.json({ error: 'Choose Razorpay, Cashfree or a split of 0–100%.' }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin.rpc('admin_update_payment_gateway', { p_mode: body!.mode, p_split_pct: splitPercent, p_admin_email: actor.email });
  if (error) {
    const mapped = adminRpcErrorResponse(error);
    if (mapped) return mapped;
    return NextResponse.json({ error: 'Could not save the payment gateway.' }, { status: 500 });
  }
  const saved = data as { payment_gateway: Mode; payment_gateway_split_pct: number };
  return NextResponse.json({ mode: saved.payment_gateway, splitPercent: saved.payment_gateway_split_pct });
}

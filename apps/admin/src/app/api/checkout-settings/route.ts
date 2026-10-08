// Checkout settings: cash on delivery / online payment switches and the
// platform-wide minimum order value (platform_settings, migration 117).
// The backend reads them on every checkout: GET /payments/availability (the
// customer app hides a switched-off method), POST /orders and /trips refuse a
// switched-off method, POST /payments/create-order and the UPI routes refuse to
// start an online payment while online is off, and the quote/order routes
// enforce the minimum on the item subtotal. The backend env stays a hard kill
// (no Cashfree keys or ONLINE_PAYMENTS_DISABLED=true / COD_DISABLED=true).
// Writes go through admin_update_checkout_settings, audited in
// admin_control_audit.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { adminRpcErrorResponse, requireAdminActor } from '@/lib/orders/adminActor';

interface SettingsRow {
  cod_enabled: boolean;
  online_payments_enabled: boolean;
  min_order_value: number | string;
}

export async function GET() {
  const { denied } = await requireAdminActor();
  if (denied) return denied;
  try {
    const [settingsRes, auditRes] = await Promise.all([
      supabaseAdmin.from('platform_settings').select('cod_enabled, online_payments_enabled, min_order_value').limit(1).single(),
      supabaseAdmin
        .from('admin_control_audit')
        .select('id, detail, admin_email, created_at')
        .eq('action', 'checkout_settings_update')
        .order('created_at', { ascending: false })
        .limit(10),
    ]);
    if (settingsRes.error) throw settingsRes.error;
    if (auditRes.error) throw auditRes.error;
    const row = settingsRes.data as unknown as SettingsRow;
    return NextResponse.json({
      codEnabled: row.cod_enabled,
      onlinePaymentsEnabled: row.online_payments_enabled,
      minOrderValue: Number(row.min_order_value),
      history: (auditRes.data ?? []).map((a) => ({ id: a.id, detail: a.detail, adminEmail: a.admin_email, createdAt: a.created_at })),
    });
  } catch {
    return NextResponse.json({ error: 'Could not load checkout settings. Apply migration 117 if this is a new database.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const { actor, denied } = await requireAdminActor();
  if (denied) return denied;
  const body = (await request.json().catch(() => null)) as { codEnabled?: unknown; onlinePaymentsEnabled?: unknown; minOrderValue?: unknown } | null;
  const minOrderValue = Number(body?.minOrderValue);
  if (typeof body?.codEnabled !== 'boolean' || typeof body.onlinePaymentsEnabled !== 'boolean' || !Number.isFinite(minOrderValue)) {
    return NextResponse.json({ error: 'Give both payment switches and a minimum order value.' }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin.rpc('admin_update_checkout_settings', {
    p_cod: body.codEnabled,
    p_online: body.onlinePaymentsEnabled,
    p_min_order: minOrderValue,
    p_admin_email: actor.email,
  });
  if (error) {
    const mapped = adminRpcErrorResponse(error);
    if (mapped) return mapped;
    return NextResponse.json({ error: 'Could not save checkout settings.' }, { status: 500 });
  }
  const saved = data as SettingsRow;
  return NextResponse.json({ codEnabled: saved.cod_enabled, onlinePaymentsEnabled: saved.online_payments_enabled, minOrderValue: Number(saved.min_order_value) });
}

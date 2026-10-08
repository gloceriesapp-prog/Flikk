// Set or clear one store's own commission rate (stores.commission_rate,
// migration 115). null clears it, so the store pays the platform default
// (platform_settings, Settings page). The backend reads the effective rate
// through store_commission_rates when it prices each new order's
// commission_amount, which weekly payouts sum; the partner app and dashboard
// show it from GET /partner/commission. Orders already placed keep the
// commission they were charged.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PUT(request: Request, ctx: RouteContext<'/api/stores/[id]/commission'>) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const { id } = await ctx.params;
  if (!UUID.test(id)) return NextResponse.json({ error: 'Invalid store ID.' }, { status: 400 });

  const body = (await request.json().catch(() => null)) as { commissionRate?: unknown } | null;
  const rate = body?.commissionRate;
  if (rate !== null && (typeof rate !== 'number' || !Number.isFinite(rate) || rate < 0 || rate > 1)) {
    return NextResponse.json({ error: 'Commission rate must be null or a number between 0 and 1 (e.g. 0.05 for 5%).' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('stores')
    .update({ commission_rate: rate === null ? null : Math.round(rate * 10000) / 10000 })
    .eq('id', id)
    .select('commission_rate')
    .maybeSingle();
  if (error) return NextResponse.json({ error: 'Could not save the commission rate. Try again.' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Store not found.' }, { status: 404 });
  const saved = (data as { commission_rate: number | string | null }).commission_rate;
  return NextResponse.json({ commissionRate: saved == null ? null : Number(saved) });
}

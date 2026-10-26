// Read/write commission settings: the default rate and cap per order
// (platform_settings) and the rate per product category
// (category_commission_rates, migration 20261026120000). service_role only:
// like platform_settings, these tables are never readable with the anon key.
// The very next checkout uses a saved change; placed orders keep their
// commission.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { parseCommissionSettings, withAllCategories, type CommissionSettings } from '@/lib/commissionRates';

async function load(): Promise<CommissionSettings> {
  const [settings, rates] = await Promise.all([
    supabaseAdmin.from('platform_settings').select('commission_rate, commission_cap_per_order').limit(1).single(),
    supabaseAdmin.from('category_commission_rates').select('category, commission_rate'),
  ]);
  if (settings.error) throw settings.error;
  if (rates.error) throw rates.error;
  const row = settings.data as { commission_rate: unknown; commission_cap_per_order: unknown };
  return {
    defaultRate: Number(row.commission_rate),
    capPerOrder: row.commission_cap_per_order == null ? null : Number(row.commission_cap_per_order),
    categories: withAllCategories((rates.data ?? []) as { category: string; commission_rate: unknown }[]),
  };
}

export async function GET() {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  try {
    return NextResponse.json(await load());
  } catch {
    return NextResponse.json({ error: 'Could not load commission rates.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  let input: CommissionSettings;
  try {
    input = parseCommissionSettings(await request.json().catch(() => null));
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Invalid commission rates.' }, { status: 400 });
  }
  try {
    const now = new Date().toISOString();
    const withRate = input.categories.filter((row) => row.commissionRate !== null);
    const cleared = input.categories.filter((row) => row.commissionRate === null).map((row) => row.category);
    if (withRate.length > 0) {
      const { error } = await supabaseAdmin.from('category_commission_rates').upsert(
        withRate.map((row) => ({ category: row.category, commission_rate: row.commissionRate, updated_at: now })),
        { onConflict: 'category' },
      );
      if (error) throw error;
    }
    if (cleared.length > 0) {
      const { error } = await supabaseAdmin.from('category_commission_rates').delete().in('category', cleared);
      if (error) throw error;
    }
    const { data: settings, error: readError } = await supabaseAdmin.from('platform_settings').select('id').limit(1).single();
    if (readError) throw readError;
    const { error } = await supabaseAdmin.from('platform_settings')
      .update({ commission_rate: input.defaultRate, commission_cap_per_order: input.capPerOrder, updated_at: now })
      .eq('id', (settings as { id: string }).id);
    if (error) throw error;
    return NextResponse.json(await load());
  } catch {
    return NextResponse.json({ error: 'Could not save commission rates. Try again.' }, { status: 500 });
  }
}

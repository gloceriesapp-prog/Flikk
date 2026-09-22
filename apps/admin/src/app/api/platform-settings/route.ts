// Server-side read/write for the single platform_settings row
// (migrations/039_platform_settings.sql) — service_role client, since this
// table intentionally has NO public RLS policy at all (unlike
// delivery_settings): commission rate is the platform's own take-rate,
// never something a customer/partner/rider app should read via the anon
// key. Same "guaranteed singleton, no [id] sub-route" shape as
// app/api/delivery-settings/route.ts.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

interface PlatformSettingsRow {
  id: string;
  commission_rate: number;
}

function mapRow(row: PlatformSettingsRow) {
  // Number(...) — PostgREST serializes Postgres `numeric` as a JSON
  // string, same coercion delivery-settings' own mapper applies.
  return { id: row.id, commissionRate: Number(row.commission_rate) };
}

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin.from('platform_settings').select('id, commission_rate').single();
    if (error) throw error;
    return NextResponse.json(mapRow(data as unknown as PlatformSettingsRow));
  } catch {
    return NextResponse.json({ error: 'Could not load platform settings.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const body = await request.json();

  try {
    const commissionRate = Number(body.commissionRate);
    if (!Number.isFinite(commissionRate) || commissionRate < 0 || commissionRate > 1) {
      throw new Error('Commission rate must be a number between 0 and 1 (e.g. 0.06 for 6%).');
    }

    const { data, error } = await supabaseAdmin
      .from('platform_settings')
      .update({ commission_rate: commissionRate, updated_at: new Date().toISOString() })
      .select('id, commission_rate')
      .single();
    if (error) throw error;

    return NextResponse.json(mapRow(data as unknown as PlatformSettingsRow));
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not save platform settings.' }, { status: 400 });
  }
}

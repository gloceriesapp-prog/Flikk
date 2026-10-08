// Dispatch settings on the delivery_settings singleton (migration 113):
// - dispatch_radius_steps_m: the expanding offer rings (metres),
// - dispatch_step_seconds: how long each ring is offered before widening,
// - max_active_trips_per_rider: live trips one rider may hold (null = no limit).
// Read by the backend on every dispatch pass (advance_dispatch_offers via
// riderDispatch worker, nearby_dispatchable_riders, rider_dispatch_offers,
// accept_dispatch_offer and the orders capacity trigger), so a save applies to
// the next ring without a deploy. Kept out of /api/delivery-settings so a save
// here never rewrites the fee columns.

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { parseDispatchSettings, type DispatchSettings } from '@/lib/dispatchSettings';

const COLUMNS = 'id, dispatch_radius_steps_m, dispatch_step_seconds, max_active_trips_per_rider';

interface Row {
  id: string;
  dispatch_radius_steps_m: number[] | null;
  dispatch_step_seconds: number | null;
  max_active_trips_per_rider: number | null;
}

function toSettings(row: Row): DispatchSettings {
  return {
    radiusStepsKm: (row.dispatch_radius_steps_m ?? [3000, 5000, 8000]).map((m) => m / 1000).sort((a, b) => a - b),
    stepSeconds: row.dispatch_step_seconds ?? 45,
    maxActiveTripsPerRider: row.max_active_trips_per_rider,
  };
}

export async function GET() {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const { data, error } = await supabaseAdmin.from('delivery_settings').select(COLUMNS).single();
  if (error) return NextResponse.json({ error: 'Could not load dispatch settings.' }, { status: 500 });
  return NextResponse.json(toSettings(data as Row));
}

export async function PATCH(request: Request) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const parsed = parseDispatchSettings(await request.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    const { data: settings, error: readError } = await supabaseAdmin.from('delivery_settings').select('id').single();
    if (readError) throw readError;
    const { data, error } = await supabaseAdmin
      .from('delivery_settings')
      .update({
        dispatch_radius_steps_m: parsed.value.radiusStepsKm.map((km) => Math.round(km * 1000)),
        dispatch_step_seconds: parsed.value.stepSeconds,
        max_active_trips_per_rider: parsed.value.maxActiveTripsPerRider,
        updated_at: new Date().toISOString(),
      })
      .eq('id', settings.id)
      .select(COLUMNS)
      .single();
    if (error) throw error;
    return NextResponse.json(toSettings(data as Row));
  } catch (err) {
    console.error('Dispatch settings save failed', { code: (err as { code?: string } | null)?.code });
    return NextResponse.json({ error: 'Could not save dispatch settings. Please try again.' }, { status: 500 });
  }
}

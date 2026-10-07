// Server-side read/write for the single delivery_settings row
// (migrations/029_delivery_settings.sql) — service_role client, same
// rationale as app/api/home-tabs/route.ts's own note. No [id] sub-route:
// this table is a guaranteed singleton (exactly one row, seeded by the
// migration, never inserted into again from here), so PATCH updates
// the singleton by its database ID. An explicit filter is required by
// PostgreSQL safe-update protection, even for singleton tables.
//
// Validation inlined here rather than a separate lib/*Validation.ts file
// (homeTabValidation.ts's own pattern) — three numeric/boolean fields with
// one real constraint each doesn't earn a whole extra file yet.

import { requireAdminSession } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { DELIVERY_SETTINGS_SELECT, mapRowToDeliverySettings, type DeliverySettingsRow } from '@/lib/supabase/deliverySettings';

export async function GET() {
  if (!(await requireAdminSession())) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  try {
    const { data, error } = await supabaseAdmin.from('delivery_settings').select(DELIVERY_SETTINGS_SELECT).single();
    if (error) throw error;
    return NextResponse.json(mapRowToDeliverySettings(data as unknown as DeliverySettingsRow));
  } catch {
    return NextResponse.json({ error: 'Could not load delivery settings.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!(await requireAdminSession())) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  try {
    const body = await request.json();
    const estimatedDeliveryMinutes = Number(body.estimatedDeliveryMinutes);
    if (typeof body.estimatedDeliveryMinutes !== 'number' || !Number.isInteger(estimatedDeliveryMinutes) || estimatedDeliveryMinutes < 1 || estimatedDeliveryMinutes > 240) {
      throw new Error('Delivery estimate must be a whole number between 1 and 240 minutes.');
    }
    const flatDeliveryFee = Number(body.flatDeliveryFee);
    const freeDeliveryThreshold = Number(body.freeDeliveryThreshold);
    const handlingFee = Number(body.handlingFee);
    if (!Number.isFinite(flatDeliveryFee) || flatDeliveryFee < 0) throw new Error('Delivery fee must be a real number, 0 or more.');
    if (!Number.isFinite(freeDeliveryThreshold) || freeDeliveryThreshold < 0) {
      throw new Error('Free-delivery threshold must be a real number, 0 or more.');
    }
    if (!Number.isFinite(handlingFee) || handlingFee < 0) throw new Error('Handling fee must be a real number, 0 or more.');
    // Rider payouts (migration 099) are optional here: omitted = unchanged.
    const riderPayouts: { rider_base_payout?: number; rider_extra_stop_payout?: number } = {};
    for (const [field, column, label] of [
      ['riderBasePayout', 'rider_base_payout', 'Minimum rider payout'],
      ['riderExtraStopPayout', 'rider_extra_stop_payout', 'Rider payout per extra store'],
    ] as const) {
      if (body[field] === undefined) continue;
      if (typeof body[field] !== 'number' || !Number.isFinite(body[field]) || body[field] < 0) {
        throw new Error(`${label} must be a real number, 0 or more.`);
      }
      riderPayouts[column] = body[field];
    }

    const { data: settings, error: readError } = await supabaseAdmin
      .from('delivery_settings').select('id').single();
    if (readError) throw readError;

    const { data, error } = await supabaseAdmin
      .from('delivery_settings')
      .update({
        flat_delivery_fee: flatDeliveryFee,
        free_delivery_enabled: Boolean(body.freeDeliveryEnabled),
        free_delivery_threshold: freeDeliveryThreshold,
        handling_fee: handlingFee,
        estimated_delivery_minutes: estimatedDeliveryMinutes,
        ...riderPayouts,
        updated_at: new Date().toISOString(),
      })
      .eq('id', settings.id)
      .select(DELIVERY_SETTINGS_SELECT)
      .single();
    if (error) throw error;

    return NextResponse.json(mapRowToDeliverySettings(data as unknown as DeliverySettingsRow));
  } catch (err) {
    if (!(err instanceof Error)) {
      console.error('Delivery settings save failed', { code: (err as { code?: string } | null)?.code });
      return NextResponse.json({ error: 'Could not save delivery settings. Please try again.' }, { status: 500 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not save delivery settings.' }, { status: 400 });
  }
}

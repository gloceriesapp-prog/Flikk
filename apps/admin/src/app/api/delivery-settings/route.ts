// Server-side read/write for the single delivery_settings row
// (migrations/029_delivery_settings.sql) — service_role client, same
// rationale as app/api/home-tabs/route.ts's own note. No [id] sub-route:
// this table is a guaranteed singleton (exactly one row, seeded by the
// migration, never inserted into again from here), so PATCH updates
// whichever row exists rather than requiring an id the admin UI has no
// real use for.
//
// Validation inlined here rather than a separate lib/*Validation.ts file
// (homeTabValidation.ts's own pattern) — three numeric/boolean fields with
// one real constraint each doesn't earn a whole extra file yet.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { DELIVERY_SETTINGS_SELECT, mapRowToDeliverySettings, type DeliverySettingsRow } from '@/lib/supabase/deliverySettings';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin.from('delivery_settings').select(DELIVERY_SETTINGS_SELECT).single();
    if (error) throw error;
    return NextResponse.json(mapRowToDeliverySettings(data as unknown as DeliverySettingsRow));
  } catch {
    return NextResponse.json({ error: 'Could not load delivery settings.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const body = await request.json();

  try {
    const flatDeliveryFee = Number(body.flatDeliveryFee);
    const freeDeliveryThreshold = Number(body.freeDeliveryThreshold);
    if (!Number.isFinite(flatDeliveryFee) || flatDeliveryFee < 0) throw new Error('Delivery fee must be a real number, 0 or more.');
    if (!Number.isFinite(freeDeliveryThreshold) || freeDeliveryThreshold < 0) {
      throw new Error('Free-delivery threshold must be a real number, 0 or more.');
    }

    const { data, error } = await supabaseAdmin
      .from('delivery_settings')
      .update({
        flat_delivery_fee: flatDeliveryFee,
        free_delivery_enabled: Boolean(body.freeDeliveryEnabled),
        free_delivery_threshold: freeDeliveryThreshold,
        updated_at: new Date().toISOString(),
      })
      .select(DELIVERY_SETTINGS_SELECT)
      .single();
    if (error) throw error;

    return NextResponse.json(mapRowToDeliverySettings(data as unknown as DeliverySettingsRow));
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not save delivery settings.' }, { status: 400 });
  }
}

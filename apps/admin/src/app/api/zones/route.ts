// Zone summaries count stores and approved riders by their real assignments.
// Privileged counts use the authenticated admin service-role route.

import { NextResponse } from 'next/server';
import { requireStoreAdmin } from '@/features/store-management/adminGate';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Zone } from '@/lib/types';

export async function GET() {
  const unauthorized = await requireStoreAdmin();
  if (unauthorized) return unauthorized;
  try {
    const [zonesRes, storesRes, ridersRes] = await Promise.all([
      supabaseAdmin.from('zones').select('id, name, is_active').order('name'),
      supabaseAdmin.from('stores').select('zone_id'),
      supabaseAdmin.from('riders').select('zone_id').eq('is_active', true),
    ]);
    if (zonesRes.error) throw zonesRes.error;
    if (storesRes.error) throw storesRes.error;
    if (ridersRes.error) throw ridersRes.error;

    const storeCountByZone = new Map<string, number>();
    for (const row of storesRes.data ?? []) {
      storeCountByZone.set(row.zone_id, (storeCountByZone.get(row.zone_id) ?? 0) + 1);
    }
    const riderCountByZone = new Map<string, number>();
    for (const rider of ridersRes.data ?? []) {
      if (rider.zone_id) riderCountByZone.set(rider.zone_id, (riderCountByZone.get(rider.zone_id) ?? 0) + 1);
    }

    const zones: Zone[] = (zonesRes.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      isActive: row.is_active,
      storeCount: storeCountByZone.get(row.id) ?? 0,
      riderCount: riderCountByZone.get(row.id) ?? 0,
    }));

    return NextResponse.json(zones);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load zones.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

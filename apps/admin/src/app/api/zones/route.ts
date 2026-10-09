// Zone summaries count stores and approved riders by their real assignments.
// Privileged counts use the authenticated admin service-role route.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Zone } from '@/lib/types';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { ZoneInputError, parseZoneActive, parseZoneName, zoneSlug } from '@/lib/zoneValidation';

export async function GET() {
  const { denied } = await requireAdmin();
  if (denied) return denied;
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

// Create a zone (admin only). New zones start inactive unless isActive is
// sent: activating one makes the approval / Add Store zone pickers appear.
export async function POST(request: Request) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const body = (await request.json().catch(() => null)) as { name?: unknown; isActive?: unknown } | null;
  try {
    const name = parseZoneName(body?.name);
    const isActive = parseZoneActive(body?.isActive) ?? false;
    const { data, error } = await supabaseAdmin
      .from('zones')
      .insert({ name, slug: zoneSlug(name), is_active: isActive })
      .select('id, name, is_active')
      .single();
    if (error?.code === '23505') return NextResponse.json({ error: 'A zone with that name already exists.' }, { status: 409 });
    if (error) throw error;
    const zone: Zone = { id: data.id, name: data.name, isActive: data.is_active, storeCount: 0, riderCount: 0 };
    return NextResponse.json(zone, { status: 201 });
  } catch (err) {
    if (err instanceof ZoneInputError) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error('Zone create failed', err);
    return NextResponse.json({ error: 'Could not create the zone. Try again.' }, { status: 500 });
  }
}

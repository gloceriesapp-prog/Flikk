// Zones page's real data — service role reads (zones itself has a public
// zones_read_all RLS policy, but stores/riders counts need the same
// service-role joins every other admin route uses). storeCount is scoped
// per zone (stores.zone_id is real); riderCount isn't — riders has no
// zone_id column at all (CLAUDE.md: single zone only, so every rider
// serves the one active zone) — every zone's riderCount is the same total
// active-rider count until multi-zone is actually in scope.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Zone } from '@/lib/types';

export async function GET() {
  try {
    const [zonesRes, storesRes, ridersRes] = await Promise.all([
      supabaseAdmin.from('zones').select('id, name, is_active').order('name'),
      supabaseAdmin.from('stores').select('zone_id'),
      supabaseAdmin.from('riders').select('id').eq('is_active', true),
    ]);
    if (zonesRes.error) throw zonesRes.error;
    if (storesRes.error) throw storesRes.error;
    if (ridersRes.error) throw ridersRes.error;

    const storeCountByZone = new Map<string, number>();
    for (const row of storesRes.data ?? []) {
      storeCountByZone.set(row.zone_id, (storeCountByZone.get(row.zone_id) ?? 0) + 1);
    }
    const activeRiderCount = (ridersRes.data ?? []).length;

    const zones: Zone[] = (zonesRes.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      isActive: row.is_active,
      storeCount: storeCountByZone.get(row.id) ?? 0,
      riderCount: row.is_active ? activeRiderCount : 0,
    }));

    return NextResponse.json(zones);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load zones.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

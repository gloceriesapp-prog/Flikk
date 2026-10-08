// Move a store to another zone (admin only) — the store page's zone picker.
// stores.zone_id decides which zone's customers can discover and order from
// the store, so only an active zone is accepted.

import { NextResponse } from 'next/server';
import { requireStoreAdmin } from '@/features/store-management/adminGate';
import { supabaseAdmin } from '@/lib/supabase/admin';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request, ctx: RouteContext<'/api/stores/[id]/zone'>) {
  const unauthorized = await requireStoreAdmin();
  if (unauthorized) return unauthorized;
  const { id } = await ctx.params;
  if (!UUID.test(id)) return NextResponse.json({ error: 'Invalid store ID.' }, { status: 400 });
  const body = (await request.json().catch(() => null)) as { zoneId?: unknown } | null;
  const zoneId = body?.zoneId;
  if (typeof zoneId !== 'string' || !UUID.test(zoneId)) return NextResponse.json({ error: 'Pick a zone.' }, { status: 400 });

  const { data: zone, error: zoneError } = await supabaseAdmin.from('zones').select('id, name, is_active').eq('id', zoneId).maybeSingle();
  if (zoneError) return NextResponse.json({ error: 'Could not load the zone. Try again.' }, { status: 500 });
  if (!zone) return NextResponse.json({ error: 'Zone not found.' }, { status: 404 });
  if (!zone.is_active) return NextResponse.json({ error: 'Activate that zone on the Zones page first.' }, { status: 400 });

  const { data, error } = await supabaseAdmin.from('stores').update({ zone_id: zone.id }).eq('id', id).select('id').maybeSingle();
  if (error) {
    console.error('Store zone update failed', error);
    return NextResponse.json({ error: 'Could not move the store. Try again.' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Store not found.' }, { status: 404 });
  return NextResponse.json({ ok: true, zoneId: zone.id, zoneName: zone.name });
}

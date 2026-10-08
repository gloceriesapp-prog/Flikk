// Rename / activate / deactivate one zone (admin only). The slug stays as
// created. Deactivating a zone hides its stores from customers (discovery
// and checkout only use active zones) and drops it from the approval and
// Add Store zone pickers; the page asks for confirmation first.

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { ZoneInputError, parseZoneActive, parseZoneName } from '@/lib/zoneValidation';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(request: Request, ctx: RouteContext<'/api/zones/[id]'>) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const { id } = await ctx.params;
  if (!UUID.test(id)) return NextResponse.json({ error: 'Invalid zone ID.' }, { status: 400 });
  const body = (await request.json().catch(() => null)) as { name?: unknown; isActive?: unknown } | null;
  try {
    const patch: { name?: string; is_active?: boolean } = {};
    if (body?.name !== undefined) patch.name = parseZoneName(body.name);
    const isActive = parseZoneActive(body?.isActive);
    if (isActive !== undefined) patch.is_active = isActive;
    if (!Object.keys(patch).length) return NextResponse.json({ error: 'No zone changes supplied.' }, { status: 400 });
    const { data, error } = await supabaseAdmin.from('zones').update(patch).eq('id', id).select('id, name, is_active').maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Zone not found.' }, { status: 404 });
    return NextResponse.json({ id: data.id, name: data.name, isActive: data.is_active });
  } catch (err) {
    if (err instanceof ZoneInputError) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error('Zone update failed', err);
    return NextResponse.json({ error: 'Could not update the zone. Try again.' }, { status: 500 });
  }
}

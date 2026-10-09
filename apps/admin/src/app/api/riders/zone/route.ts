import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';
const uuid = /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
export async function PATCH(request: Request) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  try {
    const { riderId, zoneId } = await request.json();
    if (typeof riderId !== 'string' || !uuid.test(riderId) || typeof zoneId !== 'string' || !uuid.test(zoneId))
      return NextResponse.json({ error: 'Choose a rider and an active zone.' }, { status: 400 });
    const zone = await supabaseAdmin.from('zones').select('id').eq('id', zoneId).eq('is_active', true).maybeSingle();
    if (zone.error) throw zone.error;
    if (!zone.data) return NextResponse.json({ error: 'This zone is not active.' }, { status: 400 });
    const result = await supabaseAdmin.from('riders').update({ zone_id: zoneId }).eq('id', riderId).select('id').maybeSingle();
    if (result.error) throw result.error;
    if (!result.data) return NextResponse.json({ error: 'Rider not found.' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: 'Could not assign the zone.' }, { status: 400 }); }
}

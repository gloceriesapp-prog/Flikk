// Suspend / reactivate a rider account. [id] = riders.id.
// admin_set_rider_suspension (migration 110) sets riders.is_active=false and
// forces status 'offline' in one statement; a DB trigger keeps an inactive
// rider from ever going 'online' again, nearby_online_riders and the 107
// dispatch RPCs skip inactive riders, and the rider app reads the suspension
// (with this reason) from GET /auth/me.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { actor: user, denied } = await requireAdmin();
  if (denied) return denied;

  const { id } = await context.params;
  if (!UUID.test(id)) return NextResponse.json({ error: 'Invalid rider.' }, { status: 400 });

  const body = (await request.json().catch(() => null)) as { suspend?: unknown; reason?: unknown } | null;
  if (typeof body?.suspend !== 'boolean') return NextResponse.json({ error: 'suspend must be true or false.' }, { status: 400 });
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  if (body.suspend && (reason.length < 3 || reason.length > 500)) {
    return NextResponse.json({ error: 'Give a reason (3–500 characters).' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.rpc('admin_set_rider_suspension', {
    p_rider: id,
    p_suspend: body.suspend,
    p_reason: body.suspend ? reason : null,
    p_admin: user.id,
  });
  if (error) {
    if (error.code === 'P0404') return NextResponse.json({ error: 'Rider not found.' }, { status: 404 });
    if (error.code === 'P0400') return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: 'Could not update the rider. Try again.' }, { status: 500 });
  }
  const row = data as { is_active: boolean; suspended_reason: string | null } | null;
  return NextResponse.json({ ok: true, isActive: row?.is_active ?? !body.suspend, suspendedReason: row?.suspended_reason ?? null });
}

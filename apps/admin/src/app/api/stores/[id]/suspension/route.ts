// Suspend / unsuspend a store (admin only). Distinct from the open/closed
// switch (stores.is_active), which the partner also controls.
// admin_set_store_suspension (migration 110): suspend sets admin_suspended
// and closes the store; unsuspend clears admin_suspended but leaves the
// store closed so the partner reopens it. stores_suspension_guard refuses
// is_active=true while suspended on every write path, and the partner app /
// dashboard show "Suspended by Gloceries: <reason>" from GET /partner/store.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request, ctx: RouteContext<'/api/stores/[id]/suspension'>) {
  const { actor: user, denied } = await requireAdmin();
  if (denied) return denied;
  const { id } = await ctx.params;
  if (!UUID.test(id)) return NextResponse.json({ error: 'Invalid store ID.' }, { status: 400 });

  const body = (await request.json().catch(() => null)) as { suspend?: unknown; reason?: unknown } | null;
  if (typeof body?.suspend !== 'boolean') return NextResponse.json({ error: 'suspend must be true or false.' }, { status: 400 });
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  if (body.suspend && (reason.length < 3 || reason.length > 500)) {
    return NextResponse.json({ error: 'Give a reason (3–500 characters).' }, { status: 400 });
  }

  const { error } = await supabaseAdmin.rpc('admin_set_store_suspension', {
    p_store: id,
    p_suspend: body.suspend,
    p_reason: body.suspend ? reason : null,
    p_admin: user.id,
  });
  if (error) {
    if (error.code === 'P0404') return NextResponse.json({ error: 'Store not found.' }, { status: 404 });
    if (error.code === 'P0400') return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: 'Could not update the store. Try again.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// Suspend / reinstate the partner (store owner) ACCOUNT behind a store
// (admin only). Distinct from ../suspension (the store itself): this blocks
// the owner from every partner API route and app screen.
// admin_set_partner_suspension (migration 114) sets users.partner_suspended,
// closes the owner's stores, and writes an audit row to
// partner_account_actions (admin id + reason). Reinstating leaves the stores
// closed so the partner reopens. The partner app and dashboard read the
// state and reason from GET /auth/me (partner_suspended).

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request, ctx: RouteContext<'/api/stores/[id]/owner-suspension'>) {
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
  if (reason.length > 500) return NextResponse.json({ error: 'Keep the note under 500 characters.' }, { status: 400 });

  const { data: store, error: storeError } = await supabaseAdmin.from('stores').select('owner_user_id').eq('id', id).maybeSingle();
  if (storeError) return NextResponse.json({ error: 'Could not load the store. Try again.' }, { status: 500 });
  if (!store) return NextResponse.json({ error: 'Store not found.' }, { status: 404 });

  const { error } = await supabaseAdmin.rpc('admin_set_partner_suspension', {
    p_user: store.owner_user_id,
    p_suspend: body.suspend,
    p_reason: reason || null,
    p_admin: user.id,
  });
  if (error) {
    if (error.code === 'P0404') return NextResponse.json({ error: 'Partner account not found.' }, { status: 404 });
    if (error.code === 'P0400') return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: 'Could not update the partner account. Try again.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

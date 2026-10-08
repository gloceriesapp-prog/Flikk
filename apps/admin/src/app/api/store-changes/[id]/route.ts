// Approve / reject one store profile change request (admin only).
// admin_review_store_profile_change (migration 114) applies the change to
// the live store on approve (refusing a pharmacy without a drug licence) or
// records the reason on reject; the partner app/dashboard show the outcome
// from GET /partner/store (pending_change / last_change_review).

import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/supabase/server';
import { isAllowedAdminEmail } from '@/lib/adminAccess';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { STORE_CATEGORIES } from '@/lib/store-options';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(request: Request, ctx: RouteContext<'/api/store-changes/[id]'>) {
  const user = await requireAdminSession();
  if (!user || !isAllowedAdminEmail(user.email)) return NextResponse.json({ error: 'Administrator access required.' }, { status: 401 });
  const { id } = await ctx.params;
  if (!UUID.test(id)) return NextResponse.json({ error: 'Invalid change request.' }, { status: 400 });

  const body = (await request.json().catch(() => null)) as { approve?: unknown; reason?: unknown } | null;
  if (typeof body?.approve !== 'boolean') return NextResponse.json({ error: 'approve must be true or false.' }, { status: 400 });
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  if (!body.approve && (reason.length < 3 || reason.length > 500)) {
    return NextResponse.json({ error: 'Give a rejection reason (3–500 characters).' }, { status: 400 });
  }

  if (body.approve) {
    // Same category list admin's own store editor allows.
    const { data: pending, error: readError } = await supabaseAdmin.from('store_profile_change_requests').select('changes').eq('id', id).maybeSingle();
    if (readError) return NextResponse.json({ error: 'Could not load the change. Try again.' }, { status: 500 });
    if (!pending) return NextResponse.json({ error: 'Change request not found.' }, { status: 404 });
    const category = (pending.changes as Record<string, unknown>)?.category;
    if (category !== undefined && !STORE_CATEGORIES.some((c) => c === category)) {
      return NextResponse.json({ error: `“${String(category)}” is not an allowed store category. Reject this change.` }, { status: 400 });
    }
  }

  const { error } = await supabaseAdmin.rpc('admin_review_store_profile_change', {
    p_request: id,
    p_approve: body.approve,
    p_reason: reason || null,
    p_admin: user.id,
  });
  if (error) {
    if (error.code === 'P0404') return NextResponse.json({ error: 'Change request not found.' }, { status: 404 });
    if (error.code === 'P0409') return NextResponse.json({ error: error.message }, { status: 409 });
    if (error.code === 'P0400') return NextResponse.json({ error: error.message }, { status: 400 });
    if (error.code === '23502') return NextResponse.json({ error: 'This change would blank a required store field. Reject it.' }, { status: 400 });
    console.error('Store change review failed', error);
    return NextResponse.json({ error: 'Could not review the change. Try again.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

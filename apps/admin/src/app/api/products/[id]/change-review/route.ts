// Approve/reject a partner's queued name/price edit to a LIVE product
// (products.pending_changes — save_catalogue_product holds it there instead of
// writing it, migration 115). review_product_changes applies it through the
// same catalogue save on approve (packs matched by id, so counted stock is
// kept) or drops it on reject; either way the queue is cleared. Until then
// customers keep seeing the approved name and prices.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(request: Request, ctx: RouteContext<'/api/products/[id]/change-review'>) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const { id } = await ctx.params;
  if (!UUID.test(id)) return NextResponse.json({ error: 'Invalid product ID.' }, { status: 400 });

  const body = (await request.json().catch(() => null)) as { action?: unknown } | null;
  if (body?.action !== 'approve' && body?.action !== 'reject') {
    return NextResponse.json({ error: "action must be 'approve' or 'reject'." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.rpc('review_product_changes', { p_product: id, p_approve: body.action === 'approve' });
  if (error) {
    if (error.code === 'P0404') return NextResponse.json({ error: 'Could not find that product.' }, { status: 404 });
    if (error.code === 'P0409') return NextResponse.json({ error: error.message }, { status: 409 });
    if (error.code === 'P0400') return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: 'Could not review this change. Try again.' }, { status: 500 });
  }
  if (data !== true) return NextResponse.json({ error: 'No pending change to review.' }, { status: 409 });
  return NextResponse.json({ ok: true });
}

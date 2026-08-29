// Approve/reject a store owner's pending product (partner app's own POST/
// PATCH /partner/products, which always inserts approval_status: 'pending'
// — see backend/src/routes/partner.ts's own note). Separate from the main
// PATCH /api/products/[id] (which does a full product+variants rewrite for
// editing) — this only ever flips one column, same "small, dedicated
// approval endpoint" shape as apps/admin's own store-approval route
// (app/api/approvals/stores/[userId]).
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  try {
    const { approve } = (await request.json()) as { approve: boolean };

    const { data, error } = await supabaseAdmin
      .from('products')
      .update({ approval_status: approve ? 'approved' : 'rejected' })
      .eq('id', id)
      .select('id')
      .single();
    if (error || !data) throw new Error('Could not find that product.');

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not update approval status.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

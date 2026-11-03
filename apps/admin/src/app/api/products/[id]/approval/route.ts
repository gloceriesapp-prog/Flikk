// Approve/reject a store owner's pending product (partner app's own POST/
// PATCH /partner/products, which always inserts approval_status: 'pending'
// — see backend/src/routes/partner.ts's own note). Separate from the main
// PATCH /api/products/[id] (which does a full product+variants rewrite for
// editing) — this only ever flips one column, same "small, dedicated
// approval endpoint" shape as apps/admin's own store-approval route
// (app/api/approvals/stores/[userId]).
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const { id } = await ctx.params;

  try {
    const { approve } = (await request.json()) as { approve: boolean };

    // A live product must be filed in the catalogue tree, or customers can
    // only find it by search. Partner submissions have no sub-category yet.
    if (approve) {
      const { data: product, error: readError } = await supabaseAdmin.from('products').select('sub_category_id').eq('id', id).maybeSingle();
      if (readError || !product) throw new Error('Could not find that product.');
      if (!product.sub_category_id) {
        return NextResponse.json({ error: 'Edit this product and pick its Category › Sub-category before approving it.' }, { status: 409 });
      }
    }

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

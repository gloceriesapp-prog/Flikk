// Approve/reject a partner-submitted photo sitting in products.pending_image_url
// (partner app uploads a new photo; the product stays live on its OLD image_url
// until a founder decides here). Separate from the approval route next door
// (that flips approval_status for brand-new products) — this only ever touches
// the two image columns. Approving promotes pending_image_url onto image_url;
// rejecting just drops it. Unlike the approval route, this calls
// requireAdminSession() itself — a direct /api call (curl, stale tab) bypasses
// the page-redirect middleware, so a data-touching route re-checks (see
// lib/supabase/server.ts's own note).
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdminSession } from '@/lib/supabase/server';

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const user = await requireAdminSession();
  if (!user) return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });

  try {
    const { action } = (await request.json()) as { action: 'approve' | 'reject' };
    if (action !== 'approve' && action !== 'reject') throw new Error("action must be 'approve' or 'reject'.");

    if (action === 'reject') {
      const { data, error } = await supabaseAdmin
        .from('products')
        .update({ pending_image_url: null })
        .eq('id', id)
        .select('id')
        .single();
      if (error || !data) throw new Error('Could not find that product.');
      return NextResponse.json({ ok: true });
    }

    // approve — promote the pending photo onto the live image_url, then clear it.
    const { data: current, error: readError } = await supabaseAdmin
      .from('products')
      .select('pending_image_url')
      .eq('id', id)
      .single();
    if (readError || !current) throw new Error('Could not find that product.');
    if (!current.pending_image_url) {
      return NextResponse.json({ error: 'No pending image to approve.' }, { status: 400 });
    }

    const { error: updateError } = await supabaseAdmin
      .from('products')
      .update({ image_url: current.pending_image_url, pending_image_url: null })
      .eq('id', id);
    if (updateError) throw updateError;

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not review this image.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

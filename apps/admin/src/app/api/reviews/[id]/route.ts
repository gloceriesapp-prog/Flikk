// Database triggers update store rating totals atomically with moderation.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function DELETE(request: Request, ctx: RouteContext<'/api/reviews/[id]'>) {
  const { id } = await ctx.params;

  try {
    const { data: review, error: fetchErr } = await supabaseAdmin.from('reviews').select('store_id').eq('id', id).single();
    if (fetchErr || !review) throw new Error('Review not found.');

    const { error: deleteErr } = await supabaseAdmin.from('reviews').delete().eq('id', id);
    if (deleteErr) throw deleteErr;

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not delete review.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// Moderation delete — removes a real review (abuse/spam), then recomputes
// stores.rating from what's left, same average-of-everything logic
// backend/src/routes/reviews.ts's own POST handler runs on every new
// review. Deleting a review without this step would leave stores.rating
// silently stale (still counting a review that no longer exists), the
// exact kind of drift this codebase's own money/rating-math rule (one
// real recompute, never two independently-maintained copies) exists to
// prevent.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function DELETE(request: Request, ctx: RouteContext<'/api/reviews/[id]'>) {
  const { id } = await ctx.params;

  try {
    const { data: review, error: fetchErr } = await supabaseAdmin.from('reviews').select('store_id').eq('id', id).single();
    if (fetchErr || !review) throw new Error('Review not found.');

    const { error: deleteErr } = await supabaseAdmin.from('reviews').delete().eq('id', id);
    if (deleteErr) throw deleteErr;

    const { data: remaining, error: remainingErr } = await supabaseAdmin
      .from('reviews')
      .select('rating')
      .eq('store_id', review.store_id);
    if (remainingErr) throw remainingErr;

    // No reviews left — reset to null rather than 0, same "not rated yet"
    // meaning stores.rating already carries when a store has never had one.
    const newRating = remaining.length > 0 ? Math.round((remaining.reduce((sum, r) => sum + r.rating, 0) / remaining.length) * 10) / 10 : null;

    const { error: updateErr } = await supabaseAdmin.from('stores').update({ rating: newRating }).eq('id', review.store_id);
    if (updateErr) throw updateErr;

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not delete review.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

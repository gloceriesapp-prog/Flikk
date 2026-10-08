// Server-side update/delete for one promo code — same service_role
// rationale as app/api/promo-codes/route.ts's own note.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { PROMO_CODE_SELECT, mapRowToPromoCode, type PromoCodeRow } from '@/lib/supabase/promoCodes';
import { toPromoCodeErrorMessage, toPromoCodeRow, validatePromoCodeInput, type PromoCodeWriteInput } from '@/lib/promoCodeValidation';
import { requireAdmin } from '@/lib/auth/requireAdmin';

export async function PATCH(request: Request, ctx: RouteContext<'/api/promo-codes/[id]'>) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const { id } = await ctx.params;
  const body = await request.json();

  try {
    const input: Partial<PromoCodeWriteInput> = body;
    validatePromoCodeInput(input);

    const { data, error } = await supabaseAdmin
      .from('promo_codes')
      .update(toPromoCodeRow(input))
      .eq('id', id)
      .select(PROMO_CODE_SELECT)
      .single();
    if (error) throw error;

    return NextResponse.json(mapRowToPromoCode(data as unknown as PromoCodeRow));
  } catch (err) {
    return NextResponse.json({ error: toPromoCodeErrorMessage(err, 'Could not save changes.') }, { status: 400 });
  }
}

export async function DELETE(request: Request, ctx: RouteContext<'/api/promo-codes/[id]'>) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const { id } = await ctx.params;

  try {
    // A promo code that's ever been redeemed can't be hard-deleted —
    // promo_redemptions.promo_code_id has no cascade (same real-history
    // reasoning as backend's own DELETE /partner/products/:id note on
    // order_items.product_id). Deactivating instead of deleting is the
    // real fix for "stop this code," same UX either way from the table.
    const { error } = await supabaseAdmin.from('promo_codes').delete().eq('id', id);
    if (error) {
      if (error.code === '23503') {
        return NextResponse.json(
          { error: 'This code has real redemptions and can’t be deleted — deactivate it instead.' },
          { status: 409 },
        );
      }
      throw error;
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not delete promo code.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

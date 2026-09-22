// Promo codes — service-role reads/writes, same rationale as every other
// admin-owned table here: promo_codes has RLS enabled with NO public
// policy at all (backend/migrations/019_promo_codes.sql's own note — only
// POST /promos/validate, POST /orders, and POST /trips ever read it, all
// backend service-role calls). This is the first and only place a promo
// code is ever created — POST /promos/validate only ever looks one up.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { PROMO_CODE_SELECT, mapRowToPromoCode, type PromoCodeRow } from '@/lib/supabase/promoCodes';
import { toPromoCodeErrorMessage, toPromoCodeRow, validatePromoCodeInput, type PromoCodeWriteInput } from '@/lib/promoCodeValidation';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin.from('promo_codes').select(PROMO_CODE_SELECT).order('created_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json(((data ?? []) as unknown as PromoCodeRow[]).map(mapRowToPromoCode));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load promo codes.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json();

  try {
    const input: Partial<PromoCodeWriteInput> = body;
    validatePromoCodeInput(input);

    const { data, error } = await supabaseAdmin.from('promo_codes').insert(toPromoCodeRow(input)).select(PROMO_CODE_SELECT).single();
    if (error) throw error;

    return NextResponse.json(mapRowToPromoCode(data as unknown as PromoCodeRow));
  } catch (err) {
    return NextResponse.json({ error: toPromoCodeErrorMessage(err, 'Could not create promo code.') }, { status: 400 });
  }
}

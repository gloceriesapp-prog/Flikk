// Server-side update for one product — same service_role rationale as
// app/api/products/route.ts's own note. Variants are replaced wholesale
// (delete then reinsert), not diffed — same call as
// backend/src/db/productVariants.ts's own note: a size list changes rarely
// and entirely, so the simpler approach is also the correct one here.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { PRODUCT_SELECT, mapRowToProduct, type ProductRow } from '@/lib/supabase/products';
import { toProductRow, toVariantRows, validateProductInput, type ProductWriteInput } from '@/lib/productValidation';

export async function PATCH(request: Request, ctx: RouteContext<'/api/products/[id]'>) {
  const { id } = await ctx.params;
  const body = await request.json();

  try {
    const input: Partial<ProductWriteInput> = body;
    validateProductInput(input);

    // toProductRow always writes image_url, so the admin's chosen image
    // supersedes any partner-submitted pending photo — clear it in the same
    // update (see app/api/products/[id]/image-review for the review path).
    const { error } = await supabaseAdmin
      .from('products')
      .update({ ...toProductRow(input), pending_image_url: null })
      .eq('id', id);
    if (error) throw error;

    const { error: deleteError } = await supabaseAdmin.from('product_variants').delete().eq('product_id', id);
    if (deleteError) throw deleteError;

    const { error: insertError } = await supabaseAdmin.from('product_variants').insert(toVariantRows(id, input.variants));
    if (insertError) throw insertError;

    const { data, error: refetchError } = await supabaseAdmin.from('products').select(PRODUCT_SELECT).eq('id', id).single();
    if (refetchError) throw refetchError;

    return NextResponse.json(mapRowToProduct(data as unknown as ProductRow));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not save changes.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

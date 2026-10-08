// Server-side update for one product — same service_role rationale as
// app/api/products/route.ts's own note. The product row and its packs are
// saved in ONE transaction by save_catalogue_product (lib/catalogueSave.ts):
// packs are diffed by id/size, so editing a price keeps every pack's
// counted stock, and removing a pack an active order reserves is refused
// (409) without touching the product row.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { catalogueErrorStatus, saveCatalogueProduct } from '@/lib/catalogueSave';
import { PRODUCT_SELECT, mapRowToProduct, type ProductRow } from '@/lib/supabase/products';
import { toProductRow, toVariantPayload, validateProductInput, type ProductWriteInput } from '@/lib/productValidation';

export async function PATCH(request: Request, ctx: RouteContext<'/api/products/[id]'>) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);

  try {
    const input: Partial<ProductWriteInput> = body ?? {};
    validateProductInput(input);

    // toProductRow always writes image_url, so the admin's chosen image
    // supersedes any partner-submitted pending photo — clear it in the same
    // save (see app/api/products/[id]/image-review for the review path).
    await saveCatalogueProduct(id, { ...toProductRow(input), pending_image_url: null }, toVariantPayload(input.variants));

    const { data, error: refetchError } = await supabaseAdmin.from('products').select(PRODUCT_SELECT).eq('id', id).single();
    if (refetchError) throw refetchError;

    return NextResponse.json(mapRowToProduct(data as unknown as ProductRow));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not save changes.';
    return NextResponse.json({ error: message }, { status: catalogueErrorStatus(err) });
  }
}

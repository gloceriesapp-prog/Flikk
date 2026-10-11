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

const HAS_ORDERS_MESSAGE =
  "This product has past orders and can't be deleted — set it to Out of stock instead.";

export async function DELETE(_request: Request, ctx: RouteContext<'/api/products/[id]'>) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const { id } = await ctx.params;

  try {
    // order_items.product_id references products(id) with NO cascade — a
    // product that's ever been ordered is audit/financial history and must
    // never be hard-deleted (same real-history reasoning as the promo-codes
    // route's note on promo_redemptions). Deactivating via Out of stock is the
    // real fix for "stop selling this."
    const { count, error: countError } = await supabaseAdmin
      .from('order_items')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', id);
    if (countError) throw countError;
    if ((count ?? 0) > 0) return NextResponse.json({ error: HAS_ORDERS_MESSAGE }, { status: 409 });

    // product_variants.product_id also has no cascade, so clear the packs
    // first; festival/wishlist references do cascade and need no handling.
    const { error: variantError } = await supabaseAdmin.from('product_variants').delete().eq('product_id', id);
    if (variantError) throw variantError;

    const { error } = await supabaseAdmin.from('products').delete().eq('id', id);
    if (error) {
      // Any other no-cascade reference (e.g. inventory_reservations,
      // product_popularity_daily) means real history too — treat as 409.
      if (error.code === '23503') return NextResponse.json({ error: HAS_ORDERS_MESSAGE }, { status: 409 });
      throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not delete product.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

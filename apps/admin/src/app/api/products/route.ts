// Server-side insert for a new product — uses the service_role client
// (lib/supabase/admin.ts), never the browser one, since products_owner_write
// RLS requires an authenticated store-owner session this admin dashboard
// doesn't have yet. AddProductModal collects the draft; InventoryPage POSTs
// it here and gets the real DB row (with generated id) back.
//
// validateProductInput/toProductRow/toVariantPayload are lib/productValidation.ts's
// deliberate copy of the backend's own logic — see that file's own note on
// why this dashboard can't just call the backend directly yet.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { isHomeContentKey } from '@/lib/homeContent';
import { CatalogueSaveError, catalogueErrorStatus, resolveCatalogueCategory, resolveQuickTabCategory, saveCatalogueProduct, saveProductExtras, saveProductOptions, saveVariantMarkups } from '@/lib/catalogueSave';
import { productColumns, mapRowToProduct, type ProductRow } from '@/lib/supabase/products';
import { withQuickTabScope } from '@/lib/supabase/quickTabScope';
import { toCommissionWaiver, toCutOptions, toExtraImageUrls, toProductOptions, toBrand, toCatalogueItemLink, toPreorder, toMorningSlot, toServingOptions, toUnitPriceFlag, toVariantMarkups, toProductRow, toVariantPayload, validateProductInput, type ProductWriteInput } from '@/lib/productValidation';

// Inventory/festival reads. Service role + admin check, not the browser anon
// client: RLS hides pending products' sizes and inactive stores from anon.
export async function GET() {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const { data, error } = await withQuickTabScope(scoped =>
    supabaseAdmin.from('products').select(productColumns(scoped)).order('name'));
  if (error) {
    console.error('Admin products read failed', error);
    return NextResponse.json({ error: 'Could not load products.' }, { status: 500 });
  }
  return NextResponse.json((data as unknown as ProductRow[]).map(mapRowToProduct));
}

export async function POST(request: Request) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const body = await request.json().catch(() => null);

  try {
    const input: Partial<ProductWriteInput> = body ?? {};
    const quickTabKey: unknown = body?.quickTabKey;
    if (quickTabKey !== undefined && !isHomeContentKey(quickTabKey)) throw new Error('Choose a valid quick category.');
    if (quickTabKey !== undefined) {
      input.category = await resolveQuickTabCategory(quickTabKey);
      input.subCategoryId = null;
      input.catalogueItemId = null;
    } else {
      input.category = await resolveCatalogueCategory(input.subCategoryId);
    }
    validateProductInput(input);
    // Products without a photo are never shown in the apps; admin-added
    // products go live straight away, so the photo is required here.
    if (!input.imageUrl?.trim()) throw new Error('Add a photo for this product.');

    // 'approved' explicitly, not left to the column's own default — a
    // founder adding a product here already is the approval (see
    // backend/src/routes/partner.ts's own note on the partner-app side of
    // this same gate). Product row + packs land in one transaction.
    const extraImageUrls = toExtraImageUrls(input);
    // Validated before anything is written.
    const options = toProductOptions(input);
    const extras = { ...(extraImageUrls ? { extra_image_urls: extraImageUrls } : {}), ...toCutOptions(input), ...toCommissionWaiver(input), ...toUnitPriceFlag(input), ...toMorningSlot(input), ...toServingOptions(input), ...toPreorder(input), ...toBrand(input), ...toCatalogueItemLink(input) };
    const row = { ...toProductRow(input), approval_status: 'approved' };
    const variants = toVariantPayload(input.variants);
    const markups = toVariantMarkups(input.variants);
    let productId: string;
    if (typeof quickTabKey === 'string') {
      if (input.preorderEnabled) throw new Error('Quick category products use standard ordering.');
      const { data, error } = await supabaseAdmin.rpc('create_quick_tab_product', {
        p_tab: quickTabKey, p_fields: row, p_variants: variants, p_extras: extras,
        p_markups: markups, p_options: options ?? null,
      });
      if (error?.code === 'P0400') throw new CatalogueSaveError(400, error.message);
      if (error?.code === 'PGRST202' && error.message.includes('create_quick_tab_product')) {
        throw new CatalogueSaveError(503, 'Creating quick category products requires the database update.');
      }
      if (error?.code === '23505' && error.message.includes('products_quick_tab_store_name_unique')) {
        throw new CatalogueSaveError(409, 'This product already exists for this store in this quick category. Select it from the product list.');
      }
      if (error) {
        console.error('Quick category product create failed', error.code);
        throw new CatalogueSaveError(503, 'Could not create the quick category product. Try again.');
      }
      productId = data as string;
    } else {
      productId = await saveCatalogueProduct(null, row, variants);
      await saveProductExtras(productId, extras);
      await saveVariantMarkups(productId, markups);
      if (options) await saveProductOptions(productId, options);
    }

    const { data, error: refetchError } = await withQuickTabScope(scoped => supabaseAdmin
      .from('products')
      .select(productColumns(scoped))
      .eq('id', productId)
      .single());
    if (refetchError) throw refetchError;

    return NextResponse.json(mapRowToProduct(data as unknown as ProductRow));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not add product.';
    return NextResponse.json({ error: message }, { status: catalogueErrorStatus(err) });
  }
}

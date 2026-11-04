// Server-only: saves a product row and its packs through the backend's
// save_catalogue_product RPC (backend/migrations/111) — the same single
// transaction the backend's partner/admin product routes use. Packs are
// diffed (matched by id, else by size), never deleted and re-inserted, so
// counted pack stock survives an edit and products.stock_quantity stays the
// pack total. Removing a pack an active order reserves is refused (409) with
// nothing written.

import { supabaseAdmin } from '@/lib/supabase/admin';
import type { VariantPayload } from '@/lib/productValidation';

export class CatalogueSaveError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function saveCatalogueProduct(
  productId: string | null,
  fields: Record<string, unknown>,
  variants: VariantPayload[] | null,
): Promise<string> {
  const { data, error } = await supabaseAdmin.rpc('save_catalogue_product', {
    p_product: productId,
    p_store: null,
    p_fields: fields,
    p_variants: variants,
  });
  if (error) {
    if (error.code === 'P0409') throw new CatalogueSaveError(409, error.message);
    if (error.code === 'P0404') throw new CatalogueSaveError(404, 'Could not find that product.');
    throw new CatalogueSaveError(400, error.code === 'P0400' ? error.message : 'Could not save this product.');
  }
  return data as string;
}

// Gallery photos and chicken cut options sit outside save_catalogue_product's
// field list, so they are written just after it. Validated first
// (toExtraImageUrls / toCutOptions), so a failure here is a database error;
// the product itself is already saved and a retry is safe.
export interface ProductExtras {
  extra_image_urls?: string[];
  cut_options_enabled?: boolean;
  bulk_min_kg?: number | null;
  show_unit_price?: boolean;
}
export async function saveProductExtras(productId: string, extras: ProductExtras): Promise<void> {
  if (Object.keys(extras).length === 0) return;
  const { error } = await supabaseAdmin.from('products').update(extras).eq('id', productId);
  if (error) throw new CatalogueSaveError(500, 'Product saved, but its extra photos or cut options were not. Try saving again.');
}

// Every admin-saved product is filed under a sub-category, and its category
// is that sub-category's parent (the database trigger does the same; doing
// it here too keeps the chicken/veg rules in toProductRow on the right name).
export async function resolveCatalogueCategory(subCategoryId: string | null | undefined): Promise<string> {
  if (!subCategoryId) throw new CatalogueSaveError(400, 'Pick where this product is listed (Category › Sub-category).');
  const { data, error } = await supabaseAdmin.from('sub_categories').select('categories(name)').eq('id', subCategoryId).maybeSingle();
  if (error) throw new CatalogueSaveError(500, 'Could not check the category. Try again.');
  const name = (data as { categories: { name: string } | null } | null)?.categories?.name;
  if (!name) throw new CatalogueSaveError(400, 'That sub-category no longer exists. Pick another one.');
  return name;
}

export function catalogueErrorStatus(err: unknown): number {
  return err instanceof CatalogueSaveError ? err.status : 400;
}

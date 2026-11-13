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
  waive_commission?: boolean;
  show_unit_price?: boolean;
  serving_options?: string[];
  preorder_enabled?: boolean;
  preorder_min_qty?: number;
  preorder_lead_days?: number;
}
export async function saveProductExtras(productId: string, extras: ProductExtras): Promise<void> {
  if (Object.keys(extras).length === 0) return;
  const { error } = await supabaseAdmin.from('products').update(extras).eq('id', productId);
  if (error) throw new CatalogueSaveError(500, 'Product saved, but its extra photos or cut options were not. Try saving again.');
}

// Gloceries' extra per pack sits outside save_catalogue_product too (partner
// saves never touch it, so it survives their price edits). Written after the
// save, matched by size.
export async function saveVariantMarkups(productId: string, markups: { unit_type: string; quantity: number; platform_markup: number }[]): Promise<void> {
  for (const m of markups) {
    const { error } = await supabaseAdmin.from('product_variants').update({ platform_markup: m.platform_markup })
      .eq('product_id', productId).eq('unit_type', m.unit_type).eq('quantity', m.quantity);
    if (error) throw new CatalogueSaveError(500, 'Product saved, but our extra price was not. Try saving again.');
  }
}

// Flavours replace the product's list: kept ones (by id) are updated, new
// ones inserted, missing ones deleted. Past order lines keep the flavour
// name (option_name_at_order), so deleting one is safe.
export async function saveProductOptions(productId: string,
  options: { id: string | null; name: string; image_url: string | null; extra_image_urls?: string[]; price_overrides?: Record<string, { price: number; original_price?: number }>; is_available: boolean; sort_order: number }[]): Promise<void> {
  const fail = () => new CatalogueSaveError(500, 'Product saved, but its flavours were not. Try saving again.');
  const { data: existing, error } = await supabaseAdmin.from('product_options').select('id').eq('product_id', productId);
  if (error) throw fail();
  const keep = new Set(options.map((o) => o.id).filter(Boolean));
  const gone = (existing ?? []).map((row) => row.id as string).filter((id) => !keep.has(id));
  if (gone.length) {
    const { error: delError } = await supabaseAdmin.from('product_options').delete().in('id', gone);
    if (delError) throw fail();
  }
  // Two passes so renaming A->B and B->A in one save cannot hit the unique name.
  for (const o of options.filter((o) => o.id)) {
    const { error: tmpError } = await supabaseAdmin.from('product_options').update({ name: `~${o.id}` }).eq('id', o.id!).eq('product_id', productId);
    if (tmpError) throw fail();
  }
  for (const o of options) {
    const row = { product_id: productId, name: o.name, image_url: o.image_url, ...(o.extra_image_urls === undefined ? {} : { extra_image_urls: o.extra_image_urls }), ...(o.price_overrides === undefined ? {} : { price_overrides: o.price_overrides }), is_available: o.is_available, sort_order: o.sort_order };
    const { error: writeError } = o.id
      ? await supabaseAdmin.from('product_options').update(row).eq('id', o.id).eq('product_id', productId)
      : await supabaseAdmin.from('product_options').insert(row);
    if (writeError) throw fail();
  }
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

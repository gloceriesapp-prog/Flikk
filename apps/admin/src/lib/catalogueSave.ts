// Server-only: saves a product row and its packs through the backend's
// save_catalogue_product RPC (backend/migrations/111) — the same single
// transaction the backend's partner/admin product routes use. Packs are
// diffed (matched by id, else by size), never deleted and re-inserted, so
// counted pack stock survives an edit and products.stock_quantity stays the
// pack total. Removing a pack an active order reserves is refused (409) with
// nothing written.

import { supabaseAdmin } from '@/lib/supabase/admin';
import type { HomeContentKey } from '@/lib/homeContent';
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
  imageStyle?: 'none' | 'standard',
): Promise<string> {
  const { data, error } = await supabaseAdmin.rpc(imageStyle ? 'save_catalogue_product_with_image_style' : 'save_catalogue_product', {
    ...(imageStyle ? { p_image_style: imageStyle } : {}),
    p_product: productId,
    p_store: null,
    p_fields: fields,
    p_variants: variants,
  });
  if (error) {
    if (error.code === '23505' && error.message.includes('products_quick_tab_store_name_unique')) {
      throw new CatalogueSaveError(409, 'A product with that name already exists for this store in this quick category.');
    }
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
  premium_image_url?: null;
  extra_image_urls?: string[];
  cut_options_enabled?: boolean;
  bulk_min_kg?: number | null;
  waive_commission?: boolean;
  show_unit_price?: boolean;
  morning_slot?: boolean;
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
// name in history. Active counted reservations block deletion; the complete
// flavour-list edit is transactional so conflicts cannot leave partial names.
export async function saveProductOptions(productId: string,
  options: { stock_quantity?: number | null; id: string | null; name: string; image_url: string | null; extra_image_urls?: string[]; price_overrides?: Record<string, { price: number; original_price?: number }>; is_available: boolean; sort_order: number }[]): Promise<void> {
  const { error } = await supabaseAdmin.rpc('save_product_options', { p_product: productId, p_options: options });
  if (error) {
    if (error.code === 'P0409') throw new CatalogueSaveError(409, error.message);
    throw new CatalogueSaveError(500, 'Product saved, but its flavours were not. Try saving again.');
  }
}

// General catalogue products are filed under a sub-category, and their category
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

export async function resolveQuickTabCategory(tab: HomeContentKey): Promise<string> {
  const { data, error } = await supabaseAdmin.from('home_content').select('content->>tabTitle').eq('tab_key', tab).maybeSingle();
  if (error) throw new CatalogueSaveError(503, 'Could not load this quick category.');
  if (data?.tabTitle?.trim()) return data.tabTitle.trim();

  if (tab.startsWith('custom-')) {
    const { data: custom, error: customError } = await supabaseAdmin.from('home_tabs')
      .select('name').eq('id', tab.slice(7)).maybeSingle();
    if (customError) throw new CatalogueSaveError(503, 'Could not load this quick category.');
    if (custom?.name?.trim()) return custom.name.trim();
  }
  throw new CatalogueSaveError(404, 'This quick category no longer exists.');
}

export function catalogueErrorStatus(err: unknown): number {
  return err instanceof CatalogueSaveError ? err.status : 400;
}

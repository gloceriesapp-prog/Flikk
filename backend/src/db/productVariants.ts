// The one write path for a product row and its packs — shared by
// routes/admin.ts and routes/partner.ts. Calls save_catalogue_product
// (migration 111), which diffs the pack list in the same transaction as the
// product row: a pack is updated in place (keeping its counted stock), new
// packs are inserted and only removed packs are deleted. The old
// delete-then-reinsert wiped every pack's stock_quantity and failed half-way
// when an active order reserved one of the packs.
import { supabase } from './supabase.js';
import { AppError } from '../lib/errors.js';
import type { ProductRow, VariantPayload } from '../lib/products.js';

export interface SaveCatalogueProduct {
  // null creates a new product.
  productId: string | null;
  // Partner calls pass their own store id: the product must belong to it.
  // Admin calls pass null (any store).
  storeScope: string | null;
  fields: Partial<ProductRow> & { approval_status?: string };
  // null leaves the product's packs untouched.
  variants: VariantPayload[] | null;
}

export async function saveCatalogueProduct(save: SaveCatalogueProduct): Promise<string> {
  const { data, error } = await supabase.rpc('save_catalogue_product', {
    p_product: save.productId,
    p_store: save.storeScope,
    p_fields: save.fields,
    p_variants: save.variants,
  });
  if (error) {
    if (error.code === 'P0409') throw new AppError(409, 'PACK_RESERVED', error.message);
    if (error.code === 'P0404') throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Not found for this store.');
    if (error.code === 'P0400') throw new AppError(400, 'INVALID_PRODUCT', error.message);
    throw error;
  }
  return data as string;
}

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

export function catalogueErrorStatus(err: unknown): number {
  return err instanceof CatalogueSaveError ? err.status : 400;
}

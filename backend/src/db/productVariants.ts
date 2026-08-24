// Writes product_variants rows for a product — shared by routes/admin.ts
// and routes/partner.ts so both write the exact same way instead of each
// reimplementing "replace this product's sizes." Delete-then-insert rather
// than diffing existing rows: a product's size list changes rarely and
// entirely (a store owner editing sizes is replacing the whole list, not
// patching one field of one variant), so the simpler approach is also the
// correct one here — no need for row-level diffing at this scale.
import { supabase } from './supabase.js';
import { toVariantRows, type VariantInput } from '../lib/products.js';

export async function replaceProductVariants(productId: string, variants: VariantInput[]): Promise<void> {
  const { error: deleteError } = await supabase.from('product_variants').delete().eq('product_id', productId);
  if (deleteError) throw deleteError;

  const { error: insertError } = await supabase.from('product_variants').insert(toVariantRows(productId, variants));
  if (insertError) throw insertError;
}

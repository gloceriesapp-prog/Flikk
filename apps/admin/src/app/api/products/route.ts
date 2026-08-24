// Server-side insert for a new product — uses the service_role client
// (lib/supabase/admin.ts), never the browser one, since products_owner_write
// RLS requires an authenticated store-owner session this admin dashboard
// doesn't have yet. AddProductModal collects the draft; InventoryPage POSTs
// it here and gets the real DB row (with generated id) back.
//
// validateProductInput/toProductRow/toVariantRows are lib/productValidation.ts's
// deliberate copy of the backend's own logic — see that file's own note on
// why this dashboard can't just call the backend directly yet.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { PRODUCT_SELECT, mapRowToProduct, type ProductRow } from '@/lib/supabase/products';
import { toProductRow, toVariantRows, validateProductInput, type ProductWriteInput } from '@/lib/productValidation';

export async function POST(request: Request) {
  const body = await request.json();

  try {
    const input: Partial<ProductWriteInput> = body;
    validateProductInput(input);

    const { data: product, error } = await supabaseAdmin.from('products').insert(toProductRow(input)).select('id').single();
    if (error) throw error;

    const { error: variantsError } = await supabaseAdmin.from('product_variants').insert(toVariantRows(product.id, input.variants));
    if (variantsError) throw variantsError;

    const { data, error: refetchError } = await supabaseAdmin
      .from('products')
      .select(PRODUCT_SELECT)
      .eq('id', product.id)
      .single();
    if (refetchError) throw refetchError;

    return NextResponse.json(mapRowToProduct(data as unknown as ProductRow));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not add product.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

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
import { requireStoreAdmin } from '@/features/store-management/adminGate';
import { catalogueErrorStatus, saveCatalogueProduct } from '@/lib/catalogueSave';
import { PRODUCT_SELECT, mapRowToProduct, type ProductRow } from '@/lib/supabase/products';
import { toProductRow, toVariantPayload, validateProductInput, type ProductWriteInput } from '@/lib/productValidation';

export async function POST(request: Request) {
  const unauthorized = await requireStoreAdmin();
  if (unauthorized) return unauthorized;
  const body = await request.json().catch(() => null);

  try {
    const input: Partial<ProductWriteInput> = body ?? {};
    validateProductInput(input);

    // 'approved' explicitly, not left to the column's own default — a
    // founder adding a product here already is the approval (see
    // backend/src/routes/partner.ts's own note on the partner-app side of
    // this same gate). Product row + packs land in one transaction.
    const productId = await saveCatalogueProduct(null, { ...toProductRow(input), approval_status: 'approved' }, toVariantPayload(input.variants));

    const { data, error: refetchError } = await supabaseAdmin
      .from('products')
      .select(PRODUCT_SELECT)
      .eq('id', productId)
      .single();
    if (refetchError) throw refetchError;

    return NextResponse.json(mapRowToProduct(data as unknown as ProductRow));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not add product.';
    return NextResponse.json({ error: message }, { status: catalogueErrorStatus(err) });
  }
}

// Public photo uploads go through the authenticated backend to R2.
// The returned verified HTTPS URL is persisted on the product record;
// the mobile app never receives storage credentials.

import { apiRequest } from './client';
import type { BackendVariantInput } from '../screens/catalog/data';

export async function uploadProductPhoto(base64: string, contentType: string): Promise<{ url: string }> {
  return apiRequest('/partner/product-photo', { method: 'POST', body: { base64, contentType } });
}

// Real PATCH/DELETE — backend/src/routes/partner.ts's own PATCH/DELETE
// /products/:id, both scoped to the caller's own store_id server-side.
export interface UpdateProductBody {
  name: string;
  category: string;
  imageUrl: string | null;
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock';
  variants: BackendVariantInput[];
}

export async function updateProductApi(productId: string, body: UpdateProductBody): Promise<unknown> {
  return apiRequest(`/partner/products/${productId}`, { method: 'PATCH', body });
}

export async function deleteProductApi(productId: string): Promise<void> {
  await apiRequest(`/partner/products/${productId}`, { method: 'DELETE' });
}

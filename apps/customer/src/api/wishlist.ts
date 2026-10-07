// Maps to GET/POST /wishlist, DELETE /wishlist/:productId (backend/src/
// routes/wishlist.ts) — the real account-backed wishlist. Replaces
// useWishlistStore's local-device-only AsyncStorage persistence (that
// store's own updated note): same store shape/API for every screen that
// already reads it, now backed by a real fetch instead of a device-local
// zustand-persist cache.
//
// The joined `products` row is the exact same shape routes/stores.ts's
// own product feeds return (ApiProduct, api/products.ts) — mapApiProduct
// there is reused as-is rather than a second wishlist-only mapper.

import { apiRequest } from './client';
import { mapApiProduct, type ApiProduct } from './products';
import type { Product } from '../screens/home/products/types';

export interface ApiWishlistItem {
  product_id: string;
  created_at: string;
  products: ApiProduct | null;
}

// GET /wishlist is keyset-paged ({ items, nextCursor }). The store keeps the
// whole list in memory, so walk pages up to a bounded total.
const WISHLIST_PAGE = 100;
const WISHLIST_MAX_PAGES = 10;
export async function fetchWishlist(): Promise<ApiWishlistItem[]> {
  const all: ApiWishlistItem[] = [];
  let cursor: string | null = null;
  for (let i = 0; i < WISHLIST_MAX_PAGES; i++) {
    const qs: string = `?limit=${WISHLIST_PAGE}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
    const page: { items: ApiWishlistItem[]; nextCursor: string | null } = await apiRequest(`/wishlist${qs}`);
    all.push(...page.items);
    cursor = page.nextCursor;
    if (!cursor) break;
  }
  return all;
}

export function addToWishlist(productId: string): Promise<{ ok: true }> {
  return apiRequest('/wishlist', { method: 'POST', body: { product_id: productId } });
}

export function removeFromWishlist(productId: string): Promise<{ ok: true }> {
  return apiRequest(`/wishlist/${productId}`, { method: 'DELETE' });
}

// wishlist_items.product_id can outlive the product itself (no ON DELETE
// CASCADE guard needed client-side — the FK already cascades, this just
// filters a row that arrived with a null join if a delete raced this read).
export function mapWishlistToProducts(items: ApiWishlistItem[]): Product[] {
  return items.filter((item): item is ApiWishlistItem & { products: ApiProduct } => item.products != null).map((item) => mapApiProduct(item.products));
}

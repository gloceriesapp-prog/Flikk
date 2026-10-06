// One store's own real catalog (GET /stores/:id/products, backend/src/
// routes/stores.ts) — the "a product belongs only to the store it was
// added under, nothing else ever shows here" logic. Replaces data/
// registry.ts's old mock, which mixed FARM_PRODUCTS/BAKERY_PRODUCTS/
// ESSENTIALS_PRODUCTS (Home's own tab data) into a fake "Shetty Stores"
// catalog regardless of which real store a customer actually tapped, and
// fell every other store back to the same generic mix. Sidebar categories
// are derived from whatever categories this store's own products actually
// use — not a fixed list, so a store with only 2 categories doesn't grow a
// sidebar of empty tabs.

import { useInfiniteQuery } from '@tanstack/react-query';
import { apiRequest } from '../../api/client';
import { mapApiProduct, type ApiProduct } from '../../api/products';

export interface StoreCategory { id: string; label: string }
interface StorePage { products: ApiProduct[]; nextCursor: string | null }
export function useStoreProducts(storeId: string) {
  const query = useInfiniteQuery({
    queryKey: ['store-detail', storeId, 'products'],
    initialPageParam: '' as string,
    queryFn: ({ pageParam }) => apiRequest<StorePage>(
      `/stores/${storeId}/products-page?limit=30${pageParam ? `&after=${pageParam}` : ''}`, { auth: false }),
    getNextPageParam: page => page.nextCursor ?? undefined,
    enabled: !!storeId,
    staleTime: 60_000,
    // Realtime recovery trims to the first page before refreshing. React
    // Query's automatic refetch would otherwise replay every loaded page.
    refetchOnMount: query => query.state.isInvalidated,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const products = [...new Map((query.data?.pages.flatMap(p => p.products) ?? []).map(p => [p.id, p])).values()].map(mapApiProduct);
  const labels = Array.from(new Set(products.map(p => p.categoryLabel).filter((c): c is string => !!c)));
  return { ...query, data: query.data ? { products, categories: [{ id: 'all', label: 'All' }, ...labels.map(label => ({ id: label, label }))] } : undefined };
}

// One store's own real catalog. Filters, price band and sort run on the
// server over the WHOLE catalogue (GET /stores/:id/products-page, backend/
// src/catalogue/collections.ts → store_product_page_ids RPC, migration 097),
// keyset-paged — never a client-side filter of whatever pages happen to be
// loaded. Sidebar categories come from GET /stores/:id/category-facets, a
// server aggregate, so a category whose products sit past page 1 still shows.

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../api/client';
import { mapApiProduct, type ApiProduct } from '../../api/products';
import type { StorePriceRange } from './components/StorePriceRangeSheet';
import type { StoreProductSort } from './components/StoreSortSheet';

export interface StoreCategory { id: string; label: string; imageUrl?: string }
export interface StoreProductFilters { category: string; veg: boolean; deals: boolean; price: StorePriceRange; sort: StoreProductSort }
interface StorePage { products: ApiProduct[]; nextCursor: string | null }
interface StoreFacet { category: string; productCount: number; imageUrl: string | null }

export function storeProductsPath(storeId: string, f: StoreProductFilters, after: string) {
  const params = new URLSearchParams({ limit: '30', sort: f.sort, price: f.price });
  if (f.category !== 'all') params.set('category', f.category);
  if (f.veg) params.set('veg', '1');
  if (f.deals) params.set('deals', '1');
  if (after) params.set('after', after);
  return `/stores/${storeId}/products-page?${params}`;
}

export function useStoreProducts(storeId: string, filters: StoreProductFilters) {
  const query = useInfiniteQuery({
    queryKey: ['store-detail', storeId, 'products', filters],
    initialPageParam: '' as string,
    queryFn: ({ pageParam }) => apiRequest<StorePage>(storeProductsPath(storeId, filters, pageParam), { auth: false }),
    getNextPageParam: page => page.nextCursor ?? undefined,
    enabled: !!storeId,
    staleTime: 60_000,
    // Realtime recovery trims to the first page before refreshing. React
    // Query's automatic refetch would otherwise replay every loaded page.
    refetchOnMount: query => query.state.isInvalidated,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const facets = useQuery({
    queryKey: ['store-detail', storeId, 'category-facets'],
    queryFn: () => apiRequest<StoreFacet[]>(`/stores/${storeId}/category-facets`, { auth: false }),
    enabled: !!storeId,
    staleTime: 60_000,
  });
  const products = [...new Map((query.data?.pages.flatMap(p => p.products) ?? []).map(p => [p.id, p])).values()].map(mapApiProduct);
  const categories: StoreCategory[] = [{ id: 'all', label: 'All' },
    ...(facets.data ?? []).map(f => ({ id: f.category, label: f.category, imageUrl: f.imageUrl ?? undefined }))];
  return { ...query, products, categories };
}

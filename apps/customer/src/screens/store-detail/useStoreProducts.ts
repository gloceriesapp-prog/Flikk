// Store scope is part of every request and cache key. Category IDs come only
// from this store's approved catalogue; filters run before keyset pagination.
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../api/client';
import { mapApiProduct, type ApiProduct } from '../../api/products';
import type { StorePriceRange } from './components/StorePriceRangeSheet';
import type { StoreProductSort } from './components/StoreSortSheet';

export interface StoreCategory { id: string; label: string; imageUrl?: string }
export interface StoreProductFilters {
  category: string; subcategory?: string; query?: string;
  veg: boolean; deals: boolean; price: StorePriceRange; sort: StoreProductSort;
}
interface StorePage { products: ApiProduct[]; nextCursor: string | null }

export function storeProductsPath(storeId: string, f: StoreProductFilters, after: string) {
  const params = new URLSearchParams({ limit: '30', sort: f.sort, price: f.price });
  if (f.category !== 'all') params.set('categoryId', f.category);
  if (f.category !== 'all' && f.subcategory && f.subcategory !== 'all') params.set('subcategoryId', f.subcategory);
  if (f.query?.trim()) params.set('q', f.query.trim());
  if (f.veg) params.set('veg', '1');
  if (f.deals) params.set('deals', '1');
  if (after) params.set('after', after);
  return `/stores/${encodeURIComponent(storeId)}/catalogue-products?${params}`;
}

export function storeCatalogueProducts(pages: StorePage[], storeId: string) {
  // Fail closed if an unexpected server response contains another shop's item.
  return [...new Map(pages.flatMap(p => p.products).filter(p => p.store_id === storeId)
    .map(p => [p.id, p])).values()].map(row => ({ ...mapApiProduct(row), browseStoreId: storeId }));
}

export function useStoreProducts(storeId: string, filters: StoreProductFilters) {
  const query = useInfiniteQuery({
    queryKey: ['store-detail', storeId, 'catalogue-products', filters],
    initialPageParam: '' as string,
    queryFn: ({ pageParam, signal }) => apiRequest<StorePage>(storeProductsPath(storeId, filters, pageParam), { auth: false, signal }),
    getNextPageParam: page => page.nextCursor ?? undefined,
    enabled: !!storeId,
    staleTime: 60_000,
    refetchOnMount: query => query.state.isInvalidated,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const categoriesQuery = useQuery({
    queryKey: ['store-detail', storeId, 'catalogue-categories'],
    queryFn: ({ signal }) => apiRequest<StoreCategory[]>(`/stores/${encodeURIComponent(storeId)}/catalogue-categories`, { auth: false, signal }),
    enabled: !!storeId, staleTime: 60_000,
  });
  const subcategoriesQuery = useQuery({
    queryKey: ['store-detail', storeId, 'catalogue-subcategories', filters.category],
    queryFn: ({ signal }) => apiRequest<StoreCategory[]>(`/stores/${encodeURIComponent(storeId)}/catalogue-subcategories?categoryId=${encodeURIComponent(filters.category)}`, { auth: false, signal }),
    enabled: !!storeId && filters.category !== 'all', staleTime: 60_000,
  });
  return { ...query, products: storeCatalogueProducts(query.data?.pages ?? [], storeId),
    categories: [{ id: 'all', label: 'All' }, ...(categoriesQuery.data ?? [])],
    subcategories: subcategoriesQuery.data ?? [], categoriesQuery, subcategoriesQuery };
}

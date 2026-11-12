import { useEffect, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { apiRequest } from '../../api/client';
import { mapApiProduct, type ApiProduct } from '../../api/products';
import { useLocationStore } from '../../store/useLocationStore';
export function useProductSearch(query: string, storeId?: string) {
  const [debouncedQuery, setDebounced] = useState(query.trim());
  const location = useLocationStore(s => s.location);
  useEffect(() => { const timer = setTimeout(() => setDebounced(query.trim()), 300); return () => clearTimeout(timer); }, [query]);
  const result = useInfiniteQuery({
    queryKey: ['search', 'products-flavours-v2', debouncedQuery, storeId, location?.latitude, location?.longitude],
    enabled: (!!location || !!storeId) && debouncedQuery.length >= 2,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const page = await apiRequest<{ products: ApiProduct[]; nextCursor: string | null }>(
        storeId
          ? `/stores/${encodeURIComponent(storeId)}/catalogue-products?q=${encodeURIComponent(debouncedQuery)}&sort=relevance&price=all${pageParam ? `&after=${encodeURIComponent(pageParam)}` : ''}`
          : `/browse/search?q=${encodeURIComponent(debouncedQuery)}${pageParam ? `&after=${encodeURIComponent(pageParam)}` : ''}`, { auth: false });
      return { ...page, products: page.products.filter(row => !storeId || row.store_id === storeId).map(row => ({ ...mapApiProduct(row), browseStoreId: storeId })) };
    },
    getNextPageParam: page => page.nextCursor ?? undefined,
  });
  return { ...result, isDebouncing: query.trim() !== debouncedQuery, data: result.data?.pages.flatMap(p => p.products) };
}

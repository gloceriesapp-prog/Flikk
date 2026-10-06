import { useEffect, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { apiRequest } from '../../api/client';
import { mapApiProduct, type ApiProduct } from '../../api/products';
import { useLocationStore } from '../../store/useLocationStore';
export function useProductSearch(query: string) {
  const [debouncedQuery, setDebounced] = useState(query.trim());
  const location = useLocationStore(s => s.location);
  useEffect(() => { const timer = setTimeout(() => setDebounced(query.trim()), 300); return () => clearTimeout(timer); }, [query]);
  const result = useInfiniteQuery({
    queryKey: ['search', 'products', debouncedQuery, location?.latitude, location?.longitude],
    enabled: !!location && debouncedQuery.length >= 2,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const page = await apiRequest<{ products: ApiProduct[]; nextCursor: string | null }>(
        `/browse/search?q=${encodeURIComponent(debouncedQuery)}${pageParam ? `&after=${encodeURIComponent(pageParam)}` : ''}`, { auth: false });
      return { ...page, products: page.products.map(mapApiProduct) };
    },
    getNextPageParam: page => page.nextCursor ?? undefined,
  });
  return { ...result, isDebouncing: query.trim() !== debouncedQuery, data: result.data?.pages.flatMap(p => p.products) };
}

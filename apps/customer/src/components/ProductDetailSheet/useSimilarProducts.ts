import { useInfiniteQuery } from '@tanstack/react-query';
import { apiRequest } from '../../api/client';
import { mapApiProduct, type ApiProduct } from '../../api/products';
import { useLocationStore } from '../../store/useLocationStore';
import { similarProductsEnabled } from './similarProductsEnabled';
export { similarProductsEnabled } from './similarProductsEnabled';

interface SimilarPage { products: ApiProduct[]; nextCursor: string | null }
export function useSimilarProducts(category: string | undefined, excludeId: string, storeId?: string, shouldFetch = true) {
  const pin = useLocationStore((state) => state.location);
  return useInfiniteQuery({
    queryKey: ['product-detail', 'similar-v2', category, excludeId, storeId, pin?.latitude, pin?.longitude],
    enabled: similarProductsEnabled(shouldFetch, category) && !!pin,
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ exclude: excludeId, limit: '12' });
      if (pageParam) params.set('after', pageParam);
      const page = await apiRequest<SimilarPage>(`/stores/products/similar/page?${params}`, { auth: false });
      return { products: page.products.map(mapApiProduct), nextCursor: page.nextCursor };
    },
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    staleTime: 60_000,
  });
}

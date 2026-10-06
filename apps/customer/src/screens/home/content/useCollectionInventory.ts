import { useInfiniteQuery } from '@tanstack/react-query';
import { apiRequest } from '../../../api/client';
import type { ApiProduct } from '../../../api/products';
import { useLocationStore } from '../../../store/useLocationStore';
import { useNearbyStores } from '../nearby-stores/useNearbyStores';
import type { HomeContentKey } from './contracts';

interface Page { products: ApiProduct[]; nextCursor: string | null }
export function useCollectionInventory(tab: HomeContentKey, section: string, item: string | undefined, enabled: boolean) {
  const location = useLocationStore(s => s.location);
  const nearby = useNearbyStores();
  const candidates = nearby.data.slice(0, 5);
  const storeIds = candidates.map(s => s.id).sort();
  const query = useInfiniteQuery({
    queryKey: ['home', 'groceries', 'collection-pages', storeIds, tab, section, item],
    initialPageParam: Object.fromEntries(storeIds.map(id => [id, ''])) as Record<string, string | null>,
    queryFn: async ({ pageParam }) => {
      const pages = await Promise.all(storeIds.map(async storeId => {
        const cursor = pageParam[storeId];
        if (cursor === null) return { storeId, products: [], nextCursor: null };
        const params = new URLSearchParams({ tab, section, limit: '24' });
        if (item) params.set('item', item);
        if (cursor) params.set('after', cursor);
        const page = await apiRequest<Page>(`/stores/${storeId}/collection-products?${params}`, { auth: false });
        return { storeId, ...page };
      }));
      return pages;
    },
    getNextPageParam: last => last.some(p => p.nextCursor !== null)
      ? Object.fromEntries(last.map(p => [p.storeId, p.nextCursor])) : undefined,
    enabled: enabled && !!location && storeIds.length > 0,
    staleTime: 60_000,
    // Realtime recovery trims to the first page before refreshing. React
    // Query's automatic refetch would otherwise replay every loaded page.
    // Missed updates invalidate and trim this cache during recovery. Refresh
    // that first page on reopening, without replaying unchanged older pages.
    refetchOnMount: query => query.state.isInvalidated,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  return {
    ...query,
    hasLocation: !!location,
    visibleProducts: [...new Map((query.data?.pages.flatMap(page => page.flatMap(p => p.products)) ?? []).map(p => [p.id, p])).values()],
    isLoading: !!location && (nearby.isPending || (enabled && storeIds.length > 0 && query.isPending)),
    isError: nearby.isError || query.isError,
    retry: () => { void nearby.refetch(); void query.refetch(); },
  };
}

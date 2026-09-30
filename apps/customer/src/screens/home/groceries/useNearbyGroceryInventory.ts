import { useQueries } from '@tanstack/react-query';
import { apiRequest } from '../../../api/client';
import type { ApiProduct } from '../../../api/products';
import { useLocationStore } from '../../../store/useLocationStore';
import { useNearbyStores } from '../nearby-stores/useNearbyStores';

// Shared by the local-shop previews and grocery collections. Coordinates key
// the nearby-store query; per-store stock is fetched once through query cache.
export function useNearbyGroceryInventory() {
  const location = useLocationStore((state) => state.location);
  const nearby = useNearbyStores();
  const candidates = nearby.data.slice(0, 5);
  const queries = useQueries({
    queries: candidates.map((store) => ({
      queryKey: ['home', 'groceries', 'store-inventory', store.id],
      queryFn: () => apiRequest<ApiProduct[]>(`/stores/${store.id}/products`, { auth: false }),
      staleTime: 60_000,
    })),
  });
  const inventory = candidates.map((store, index) => ({ store, products: queries[index].data ?? [] }));

  return {
    hasLocation: location !== null,
    inventory,
    // Closed shops remain browseable in shop previews, but their items must
    // not be presented as currently orderable in the shopping collections.
    availableProducts: inventory.filter(({ store }) => store.isOpen).flatMap(({ products }) => products),
    isLoading: Boolean(location) && (nearby.isPending || queries.some((query) => query.isPending)),
    isError: nearby.isError || queries.some((query) => query.isError),
    retry: () => {
      if (!location) return;
      void nearby.refetch();
      queries.forEach((query) => { void query.refetch(); });
    },
  };
}

import { useQueries } from '@tanstack/react-query';
import { useLocationStore } from '../../../store/useLocationStore';
import { useNearbyStores } from '../nearby-stores/useNearbyStores';
import { inventoryPreviewQuery } from '../loading/inventoryQuery';

// Shared by the local-shop previews and grocery collections. Coordinates key
// the nearby-store query; per-store stock is fetched once through query cache.
export function useNearbyGroceryInventory(tabKey?: 'grocery' | 'fresh' | 'regional') {
  const location = useLocationStore((state) => state.location);
  const nearby = useNearbyStores();
  const candidates = nearby.data.slice(0, 5);
  const queries = useQueries({
    queries: candidates.map((store) => inventoryPreviewQuery(store.id, tabKey)),
  });
  const inventory = candidates.map((store, index) => ({ store, products: queries[index].data ?? [] }));

  return {
    hasLocation: location !== null,
    inventory,
    // Browsing includes closed shops and sold-out stock. Cards and checkout
    // enforce availability separately; closure must not empty a collection.
    visibleProducts: inventory.flatMap(({ store, products }) => products.map((product) => ({ ...product, stores: product.stores ? { ...product.stores, is_active: product.stores.is_active ?? store.isOpen } : product.stores }))),
    isLoading: Boolean(location) && (nearby.isPending || queries.some((query) => query.isPending)),
    isError: nearby.isError || queries.some((query) => query.isError),
    retry: () => {
      if (!location) return;
      void nearby.refetch();
      queries.forEach((query) => { void query.refetch(); });
    },
  };
}

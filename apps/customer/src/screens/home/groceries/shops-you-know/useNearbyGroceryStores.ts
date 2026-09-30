import { mapApiProduct } from '../../../../api/products';
import { isGroceryProduct } from '../isGroceryProduct';
import { useNearbyGroceryInventory } from '../useNearbyGroceryInventory';

// Inspect the existing distance-ranked nearby results. Only stores with real
// grocery stock qualify; never substitute another seller's products.
export function useNearbyGroceryStores() {
  const nearby = useNearbyGroceryInventory();
  const stores = nearby.inventory
    .map(({ store, products }) => ({ ...store, products: products.filter(isGroceryProduct).slice(0, 3).map(mapApiProduct) }))
    .filter((store) => store.products.length > 0)
    .slice(0, 3);

  return {
    stores,
    isLoading: nearby.isLoading,
    isError: nearby.isError,
    retry: nearby.retry,
  };
}

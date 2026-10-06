import { useNearbyGroceryInventory } from '../../groceries/useNearbyGroceryInventory';
import { FESTIVAL_PRODUCT_GROUPS } from '../collections/festivalProductGroups';

const merchantNames = /\b(puja|pooja|florist|flowers?|sweets?|mithai)\b/i;

export function useFestivalShops() {
  const inventory = useNearbyGroceryInventory();
  // Keep closed merchants browseable with their actual status. General
  // stores qualify through relevant stock, not fabricated merchant types.
  const stores = inventory.inventory
    .filter(({ store, products }) => merchantNames.test(store.name) || products.some((product) => FESTIVAL_PRODUCT_GROUPS.some((pattern) => pattern.test(product.name))))
    .map(({ store }) => store);
  return { ...inventory, stores };
}

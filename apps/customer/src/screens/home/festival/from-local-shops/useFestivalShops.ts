import { useNearbyGroceryInventory } from '../../groceries/useNearbyGroceryInventory';
import { FESTIVAL_PRODUCT_GROUPS } from '../collections/festivalProductGroups';

const merchantNames = /\b(puja|pooja|florist|flowers?|sweets?|mithai)\b/i;

// storeIds: shops selling the admin Festival Section's products. Without
// them (no admin picks) shops qualify by keyword-matched stock or name.
export function useFestivalShops(storeIds?: string[]) {
  const inventory = useNearbyGroceryInventory();
  const adminShops = storeIds ? new Set(storeIds) : null;
  // Keep closed merchants browseable with their actual status. General
  // stores qualify through relevant stock, not fabricated merchant types.
  const stores = inventory.inventory
    .filter(({ store, products }) => adminShops
      ? adminShops.has(store.id)
      : merchantNames.test(store.name) || products.some((product) => FESTIVAL_PRODUCT_GROUPS.some((pattern) => pattern.test(product.name))))
    .map(({ store }) => store);
  return { ...inventory, stores };
}

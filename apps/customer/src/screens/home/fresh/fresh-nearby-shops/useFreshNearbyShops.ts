import { mapApiProduct } from '../../../../api/products';
import { useNearbyGroceryInventory } from '../../groceries/useNearbyGroceryInventory';
import { selectBalancedProducts } from '../../groceries/selectBalancedProducts';
import { FRESH_CATEGORIES } from '../shop-fresh/data';

const PRODUCE_GROUPS = FRESH_CATEGORIES.flatMap((category) => category.groups);

export function useFreshNearbyShops() {
  const nearby = useNearbyGroceryInventory();
  const stores = nearby.inventory
    .map(({ store, products }) => ({ ...store, products: selectBalancedProducts(products, PRODUCE_GROUPS, 3).map(mapApiProduct) }))
    .filter((store) => store.products.length > 0)
    .slice(0, 4);
  return { ...nearby, stores };
}

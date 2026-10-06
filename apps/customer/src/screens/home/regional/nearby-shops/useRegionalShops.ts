import { mapApiProduct } from '../../../../api/products';
import { useNearbyGroceryInventory } from '../../groceries/useNearbyGroceryInventory';
import { selectBalancedProducts } from '../../groceries/selectBalancedProducts';
import { REGIONAL_PRODUCT_GROUPS } from '../shop-by-category/data';

export function useRegionalShops() {
  const inventory = useNearbyGroceryInventory();
  const stores = inventory.inventory.map(({ store, products }) => ({ ...store, products: selectBalancedProducts(products, REGIONAL_PRODUCT_GROUPS, 3).map(mapApiProduct) })).filter((store) => store.products.length > 0).slice(0, 4);
  return { ...inventory, stores };
}

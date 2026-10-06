import { mapApiProduct } from '../../../../api/products';
import { useNearbyGroceryInventory } from '../../groceries/useNearbyGroceryInventory';
import { selectBalancedProducts } from '../../groceries/selectBalancedProducts';
import { DISCOVERY_GROUPS, productExplanation } from './data';

export function useSomethingNew() {
  const inventory = useNearbyGroceryInventory();
  const describedStock = inventory.visibleProducts.filter((product) => productExplanation(product.description).length > 0);
  const products = selectBalancedProducts(describedStock, DISCOVERY_GROUPS, 6).map((product) => ({ ...mapApiProduct(product), explanation: productExplanation(product.description) }));
  return { ...inventory, products };
}

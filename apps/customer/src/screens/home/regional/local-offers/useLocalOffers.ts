import { mapApiProduct } from '../../../../api/products';
import { useNearbyGroceryInventory } from '../../groceries/useNearbyGroceryInventory';
import { selectBalancedProducts } from '../../groceries/selectBalancedProducts';
import { REGIONAL_PRODUCT_GROUPS } from '../shop-by-category/data';

export function useLocalOffers() {
  const inventory = useNearbyGroceryInventory();
  const discountedStock = inventory.visibleProducts.filter((product) => Number.isFinite(product.price) && product.price >= 0 && product.original_price != null && Number.isFinite(product.original_price) && product.original_price > product.price);
  const products = selectBalancedProducts(discountedStock, REGIONAL_PRODUCT_GROUPS, 6).map(mapApiProduct);
  return { ...inventory, products };
}

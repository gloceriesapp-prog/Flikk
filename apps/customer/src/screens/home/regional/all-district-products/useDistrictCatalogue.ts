import { useNearbyGroceryInventory } from '../../groceries/useNearbyGroceryInventory';
import { REGIONAL_PRODUCT_GROUPS } from '../shop-by-category/data';

export function useDistrictCatalogue() {
  const district = useNearbyGroceryInventory();
  // Preserve separate seller listings; deduplicate IDs only.
  const catalogue = [...new Map(district.visibleProducts.filter((product) => REGIONAL_PRODUCT_GROUPS.some((group) => group.test(product.name))).map((product) => [product.id, product])).values()];
  return { catalogue };
}

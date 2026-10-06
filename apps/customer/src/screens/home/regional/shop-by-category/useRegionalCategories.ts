import { useNearbyGroceryInventory } from '../../groceries/useNearbyGroceryInventory';
import { REGIONAL_CATEGORIES } from './data';

export function useRegionalCategories() {
  const inventory = useNearbyGroceryInventory();
  const categories = REGIONAL_CATEGORIES.map((category) => {
    const products = inventory.visibleProducts.filter((product) => category.groups.some((pattern) => pattern.test(product.name)));
    return { category, imageUrl: products.find((product) => product.image_url)?.image_url ?? undefined };
  });
  return { ...inventory, categories };
}

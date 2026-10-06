import { mapApiProduct } from '../../../../api/products';
import { useNearbyGroceryInventory } from '../../groceries/useNearbyGroceryInventory';
import { selectBalancedProducts } from '../../groceries/selectBalancedProducts';
import { FRESH_CATEGORIES } from '../shop-fresh/data';
import { VEGETABLE_PREVIEW_PRODUCTS } from '../everyday-vegetables/data';
import { VERIFIED_HOME_GROWERS, PREVIEW_HOME_GROWERS } from './data';

const PRODUCE_GROUPS = FRESH_CATEGORIES.filter((category) => category.id !== 'fresh-cuts').flatMap((category) => category.groups);

export function useHomeGrowers() {
  const inventory = useNearbyGroceryInventory();
  const produce = selectBalancedProducts(inventory.visibleProducts, PRODUCE_GROUPS, inventory.visibleProducts.length);
  const previewOnly = __DEV__ && process.env.EXPO_PUBLIC_ENABLE_DESIGN_PREVIEWS === 'true' && VERIFIED_HOME_GROWERS.length === 0;
  const growers = previewOnly
    ? PREVIEW_HOME_GROWERS.map((grower, index) => ({ ...grower, products: VEGETABLE_PREVIEW_PRODUCTS.slice(index * 3, index * 3 + 3) }))
    : VERIFIED_HOME_GROWERS.filter((grower) => grower.verified)
      .map((grower) => ({ ...grower, products: produce.filter((product) => grower.productIds.includes(product.id)).map(mapApiProduct) }))
      .filter((grower) => grower.products.length > 0);
  return { ...inventory, growers, previewOnly };
}

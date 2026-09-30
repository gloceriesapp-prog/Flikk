import { mapApiProduct } from '../../../../api/products';
import { useNearbyGroceryInventory } from '../useNearbyGroceryInventory';
import { selectBalancedProducts } from '../selectBalancedProducts';
import { KITCHEN_GROUPS } from '../kitchen-essentials/data';
import { PREVIEW_LOCAL_BRANDS, VERIFIED_LOCAL_BRANDS } from './data';

export function useLocalPantryBrands() {
  const inventory = useNearbyGroceryInventory();
  const pantryProducts = selectBalancedProducts(inventory.availableProducts, KITCHEN_GROUPS, inventory.availableProducts.length);
  const brands = VERIFIED_LOCAL_BRANDS.filter((brand) => brand.verified)
    .map((brand) => ({ ...brand, products: pantryProducts.filter((product) => brand.productIds.includes(product.id)).map(mapApiProduct) }))
    .filter((brand) => brand.products.length > 0);

  // Preview mode is explicit and only used until a verified registry exists.
  // Once configured, unserviceable/empty inventory must not become previews.
  const previewOnly = VERIFIED_LOCAL_BRANDS.length === 0;
  return { ...inventory, previewOnly, brands: previewOnly ? PREVIEW_LOCAL_BRANDS.map((brand) => ({ ...brand, products: [] })) : brands };
}

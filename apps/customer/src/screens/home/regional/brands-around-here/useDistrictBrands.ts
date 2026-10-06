import { useLocationStore } from '../../../../store/useLocationStore';
import { useNearbyGroceryInventory } from '../../groceries/useNearbyGroceryInventory';
import { VERIFIED_LOCAL_BRANDS } from '../../groceries/local-brands/data';
import { DISTRICT_BRAND_COLLECTIONS, DISTRICT_BRAND_PREVIEWS } from './data';

export function useDistrictBrands() {
  const inventory = useNearbyGroceryInventory();
  const location = useLocationStore((state) => state.location);
  const previewOnly = __DEV__ && process.env.EXPO_PUBLIC_ENABLE_DESIGN_PREVIEWS === 'true' && DISTRICT_BRAND_COLLECTIONS.length === 0;
  const eligibleIds = new Set(DISTRICT_BRAND_COLLECTIONS.filter(({ bounds }) => location && location.latitude >= bounds.south && location.latitude <= bounds.north && location.longitude >= bounds.west && location.longitude <= bounds.east).flatMap((collection) => collection.brandIds));
  const availableIds = new Set(inventory.visibleProducts.map((product) => product.id));
  const brands = previewOnly ? DISTRICT_BRAND_PREVIEWS : VERIFIED_LOCAL_BRANDS.filter((brand) => brand.verified && brand.name.trim() && brand.origin.trim() && eligibleIds.has(brand.id) && brand.productIds.some((id) => availableIds.has(id)));
  return { ...inventory, brands, previewOnly };
}

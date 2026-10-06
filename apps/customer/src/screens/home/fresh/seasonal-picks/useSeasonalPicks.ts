import { mapApiProduct } from '../../../../api/products';
import { useLocationStore } from '../../../../store/useLocationStore';
import { useNearbyGroceryInventory } from '../../groceries/useNearbyGroceryInventory';
import { selectBalancedProducts } from '../../groceries/selectBalancedProducts';
import { FRESH_CATEGORIES } from '../shop-fresh/data';
import { SEASONAL_COLLECTIONS, SEASONAL_PREVIEW_PRODUCTS } from './data';

export function useSeasonalPicks() {
  const nearby = useNearbyGroceryInventory();
  const location = useLocationStore((state) => state.location);
  const dateParts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const part = (type: string) => dateParts.find((value) => value.type === type)?.value ?? '';
  const today = `${part('year')}-${part('month')}-${part('day')}`;
  const ids = new Set(SEASONAL_COLLECTIONS.filter((collection) => location && today >= collection.startsOn && today <= collection.endsOn && location.latitude >= collection.bounds.south && location.latitude <= collection.bounds.north && location.longitude >= collection.bounds.west && location.longitude <= collection.bounds.east).flatMap((collection) => collection.productIds));
  const previewOnly = __DEV__ && process.env.EXPO_PUBLIC_ENABLE_DESIGN_PREVIEWS === 'true' && SEASONAL_COLLECTIONS.length === 0;
  const products = previewOnly ? SEASONAL_PREVIEW_PRODUCTS : selectBalancedProducts(nearby.visibleProducts.filter((product) => ids.has(product.id)), FRESH_CATEGORIES.flatMap((category) => category.groups), 6).map(mapApiProduct);
  return { ...nearby, products, previewOnly };
}

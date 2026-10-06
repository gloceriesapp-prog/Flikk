import { mapContentProduct } from '../../content/productMapping';
import { selectBalancedProducts } from '../../groceries/selectBalancedProducts';
import { useNearbyGroceryInventory } from '../../groceries/useNearbyGroceryInventory';
import { PUJA_PRODUCT_GROUPS } from '../puja-essentials/data';
import { PUJA_PREVIEW_PRODUCTS } from '../puja-essentials/previewProducts';
import { FLOWER_PRODUCT_GROUPS } from '../flowers-and-garlands/data';
import { FLOWER_PREVIEW_PRODUCTS } from '../flowers-and-garlands/previewProducts';
import { SWEET_PRODUCT_GROUPS } from '../sweets-to-share/data';
import { SWEET_PREVIEW_PRODUCTS } from '../sweets-to-share/previewProducts';
import { FESTIVAL_FRUIT_GROUPS } from '../fruits-for-the-festival/data';
import { FESTIVAL_FRUIT_PREVIEW_PRODUCTS } from '../fruits-for-the-festival/previewProducts';
import { LIGHT_PRODUCT_GROUPS, DECOR_PRODUCT_GROUPS } from '../light-up-home/data';
import { FESTIVAL_PRODUCT_GROUPS } from './festivalProductGroups';
import { hasGenuineDiscount } from '../festival-offers/data';

const collections = {
  'puja-essentials': { title: 'Puja essentials', groups: PUJA_PRODUCT_GROUPS, samples: PUJA_PREVIEW_PRODUCTS },
  'flowers-and-garlands': { title: 'Flowers & garlands', groups: FLOWER_PRODUCT_GROUPS, samples: FLOWER_PREVIEW_PRODUCTS },
  'sweets-to-share': { title: 'Sweets to share', groups: SWEET_PRODUCT_GROUPS, samples: SWEET_PREVIEW_PRODUCTS },
  'festival-fruits': { title: 'Fruits for the festival', groups: FESTIVAL_FRUIT_GROUPS, samples: FESTIVAL_FRUIT_PREVIEW_PRODUCTS },
  'lights-and-diyas': { title: 'Lights & Diyas', groups: LIGHT_PRODUCT_GROUPS, samples: PUJA_PREVIEW_PRODUCTS.filter((product) => product.id === 'puja-preview-diyas') },
  'rangoli-and-decor': { title: 'Rangoli & Decor', groups: DECOR_PRODUCT_GROUPS, samples: [] },
  'festival-offers': { title: 'Festival offers', groups: FESTIVAL_PRODUCT_GROUPS, samples: [], discountOnly: true },
};

export type FestivalCollectionKey = keyof typeof collections;

// Both the Home shelf and its explore page share stock, matching and preview
// rules. Only the shelf imposes a limit; the catalogue exposes every match.
export function useFestivalCollection(key: FestivalCollectionKey, limit?: number) {
  const inventory = useNearbyGroceryInventory();
  const collection = collections[key];
  const eligibleProducts = 'discountOnly' in collection && collection.discountOnly
    ? inventory.visibleProducts.filter(hasGenuineDiscount)
    : inventory.visibleProducts;
  const realProducts = selectBalancedProducts(
    eligibleProducts,
    collection.groups,
    limit ?? eligibleProducts.length,
  ).map(mapContentProduct);
  const previewOnly = __DEV__ && process.env.EXPO_PUBLIC_ENABLE_DESIGN_PREVIEWS === 'true' && __DEV__ && collection.samples.length > 0 && realProducts.length === 0 && !inventory.isLoading && !inventory.isError;
  const products = previewOnly ? collection.samples.slice(0, limit) : realProducts;
  return { ...inventory, title: collection.title, products, previewOnly };
}

// Looks up what a tapped store sells. Real content for Shetty Stores reuses
// the same catalog data already authored for Home's category tabs (a
// kirana store plausibly stocks all three) instead of a fourth copy of the
// same products; every other store still opens the same premium UI with a
// single "All" sidebar item and a generic mixed grid, keyed by whatever
// name the caller passed in — no store card is a dead end.
//
// ponytail: generic fallback is one flat product list, not a real
// per-store catalog. Upgrade a store from fallback to real content by
// adding a case here, the same way Shetty Stores was.

import { BAKERY_PRODUCTS } from '../../home/bakery/data';
import { ESSENTIALS_PRODUCTS } from '../../home/essentials/data';
import { FARM_PRODUCTS } from '../../home/groceries/data';
import type { StoreDetailData } from '../types';

const SHETTY_STORES_DATA: StoreDetailData = {
  title: 'Shetty Stores',
  subCategories: [
    { id: 'all', label: 'All' },
    { id: 'fresh-produce', label: 'Fresh Produce' },
    { id: 'bakery', label: 'Bakery' },
    { id: 'household', label: 'Household' },
  ],
  productsBySubCategory: {
    all: [...FARM_PRODUCTS, ...BAKERY_PRODUCTS, ...ESSENTIALS_PRODUCTS],
    'fresh-produce': FARM_PRODUCTS,
    bakery: BAKERY_PRODUCTS,
    household: ESSENTIALS_PRODUCTS,
  },
};

const REGISTRY: Record<string, StoreDetailData> = {
  'shetty-stores': SHETTY_STORES_DATA,
};

const FALLBACK_PRODUCTS = [...FARM_PRODUCTS.slice(0, 2), ...ESSENTIALS_PRODUCTS.slice(0, 2)];

export function getStoreDetailData(storeId: string, fallbackName: string): StoreDetailData {
  return (
    REGISTRY[storeId] ?? {
      title: fallbackName,
      subCategories: [{ id: 'all', label: 'All' }],
      productsBySubCategory: { all: FALLBACK_PRODUCTS },
    }
  );
}

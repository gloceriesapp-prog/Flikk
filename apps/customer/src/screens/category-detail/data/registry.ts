// Looks up the content for whichever category was tapped. A handful of
// categories have real, hand-built content (see the imports below); every
// other tile still opens the same premium UI with a single "All" sidebar
// item and a generic product list, keyed by whatever label the caller
// passed in — so no tile in the app is a dead end.
//
// ponytail: generic fallback is one flat product list, not a real catalog.
// Upgrade a category from fallback to real content by adding a data file
// here, the same way vegetables.ts was added.

import type { CategoryDetailData } from '../types';
import { VEGETABLE_DETAIL_DATA } from './vegetables';

const REGISTRY: Record<string, CategoryDetailData> = {
  'fresh-vegetable': VEGETABLE_DETAIL_DATA,
  'vegetables-fruits': VEGETABLE_DETAIL_DATA,
};

const FALLBACK_PRODUCTS = [
  { id: 'fallback-1', name: 'Everyday Essential', localName: 'Local Pick', weight: '500 g', price: 45, rating: 4.3, ratingCount: '2.1k', imageSeed: 'fallback-1' },
  { id: 'fallback-2', name: 'Store Favourite', localName: 'Local Pick', weight: '1 kg', price: 60, originalPrice: 70, rating: 4.4, ratingCount: '3.4k', imageSeed: 'fallback-2' },
  { id: 'fallback-3', name: 'Daily Staple', localName: 'Local Pick', weight: '250 g', price: 30, rating: 4.2, ratingCount: '1.6k', imageSeed: 'fallback-3' },
  { id: 'fallback-4', name: 'Neighbourhood Pick', localName: 'Local Pick', weight: '200 g', price: 55, originalPrice: 65, rating: 4.5, ratingCount: '900', imageSeed: 'fallback-4' },
];

export function getCategoryDetailData(categoryId: string, fallbackLabel: string): CategoryDetailData {
  return (
    REGISTRY[categoryId] ?? {
      title: fallbackLabel,
      subCategories: [{ id: 'all', label: 'All' }],
      productsBySubCategory: { all: FALLBACK_PRODUCTS },
    }
  );
}

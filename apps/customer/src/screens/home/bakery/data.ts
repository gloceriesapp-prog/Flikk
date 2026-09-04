// Placeholder content for the "Bakery" category tab. Same caveat as every
// other placeholder dataset in screens/home/ — no real catalog backend behind
// this yet, see specs/01-customer-app/screens.md for what replaces it.

import type { Product } from '../products/types';
import type { SubCategory } from '../category-tab/types';

export const BAKERY_SUBCATEGORIES: SubCategory[] = [
  { id: 'breads-buns', label: 'Breads & Buns', imageSeed: 'bakery-breads' },
  { id: 'cakes-pastries', label: 'Cakes & Pastries', imageSeed: 'bakery-cakes' },
  { id: 'cookies-rusk', label: 'Cookies & Rusk', imageSeed: 'bakery-cookies' },
  { id: 'batters-mixes', label: 'Batters & Mixes', imageSeed: 'bakery-batters' },
  { id: 'bakery-snacks', label: 'Bakery Snacks', imageSeed: 'bakery-snacks' },
  { id: 'frozen-desserts', label: 'Frozen Desserts', imageSeed: 'bakery-frozen' },
  { id: 'party-cakes', label: 'Party Cakes', imageSeed: 'bakery-party' },
  { id: 'health-breads', label: 'Health Breads', imageSeed: 'bakery-health' },
];

export const BAKERY_PRODUCTS: Product[] = [
  { id: 'wheat-bread', name: 'Whole Wheat Bread', localName: 'Gothi Rotti', weight: '400 g', price: 45, rating: 4.3, ratingCount: '7.4k', imageSeed: 'bakery-wheat-bread', freshnessTag: 'Baked today' },
  { id: 'butter-croissant', name: 'Butter Croissant', localName: 'Bakery Special', weight: '2 pc', price: 60, originalPrice: 70, rating: 4.6, ratingCount: '3.1k', imageSeed: 'bakery-croissant', freshnessTag: 'Baked today' },
  { id: 'choco-muffin', name: 'Chocolate Muffin', localName: 'Bakery Special', weight: '4 pc', price: 85, rating: 4.5, ratingCount: '5.6k', imageSeed: 'bakery-muffin' },
  { id: 'dinner-rolls', name: 'Dinner Rolls', localName: 'Bun', weight: '6 pc', price: 40, originalPrice: 48, rating: 4.2, ratingCount: '2.9k', imageSeed: 'bakery-rolls', freshnessTag: 'Baked today' },
];

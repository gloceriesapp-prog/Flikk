// Placeholder content for the "Bakery" category tab's sub-category tiles
// (labels/icons, not product cards) — real per-category catalog feed
// still needs building for this tab's own product rows, see
// specs/01-customer-app/screens.md. BAKERY_PRODUCTS (fabricated product
// data) was removed from this file per an explicit ask to strip every
// product-card dummy dataset out of the app.

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

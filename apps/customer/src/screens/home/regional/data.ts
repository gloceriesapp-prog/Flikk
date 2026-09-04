// Dummy content for the "Regional" tab — same mock-data caveat as every
// other Home dataset in screens/home/ (see coastal-kitchen-picks/data.ts's
// own note): no real catalog backend behind these three rows yet, real
// products replace them once real regional-brand/loose-item/sweets
// inventory is actually onboarded from stores.
//
// Coastal Kitchen Staples deliberately does NOT duplicate its own product
// list here — it imports COASTAL_KITCHEN_PICKS_PRODUCTS directly from
// coastal-kitchen-picks/data.ts, the same real (if it existed) source
// AllTabSections' own CoastalKitchenPicksSection uses, so the two rows can
// never drift out of sync with each other.

import { COASTAL_KITCHEN_PICKS_PRODUCTS } from '../coastal-kitchen-picks/data';
import type { Product } from '../products/types';

export { COASTAL_KITCHEN_PICKS_PRODUCTS as COASTAL_STAPLES_PRODUCTS };

// "Local Brands You Won't Find Elsewhere" — the literal "can't get this on
// Blinkit" proof point (see the strategy discussion this tab came out
// of). Named regional brands, not generic category labels.
export const LOCAL_BRAND_PRODUCTS: Product[] = [
  { id: 'reg-mangaldeep', name: 'Mangaldeep Incense Sticks', localName: 'Ubbatti Kaddi', weight: '20 sticks', price: 35, rating: 4.6, ratingCount: '4.1k', imageSeed: 'reg-mangaldeep' },
  { id: 'reg-udupi-podi', name: 'Udupi Style Chutney Podi', localName: 'Chutney Pudi', weight: '200 g', price: 60, originalPrice: 70, rating: 4.7, ratingCount: '2.8k', imageSeed: 'reg-udupi-podi' },
  { id: 'reg-shankarpali', name: 'Amma Naturals Shankarpali', localName: 'Shankarpali', weight: '250 g', price: 75, rating: 4.5, ratingCount: '1.6k', imageSeed: 'reg-shankarpali' },
  { id: 'reg-filter-coffee', name: 'Kaup Coast Filter Coffee', localName: 'Kaapi Pudi', weight: '200 g', price: 110, rating: 4.8, ratingCount: '3.3k', imageSeed: 'reg-filter-coffee' },
];

// "Loose & By-Weight Items" — sold loose/by-weight, the kirana-specific
// thing a packaged-only quick-commerce catalog structurally can't offer.
export const LOOSE_ITEM_PRODUCTS: Product[] = [
  { id: 'reg-turmeric-loose', name: 'Turmeric Powder (Loose)', localName: 'Arishina Pudi', weight: '250 g', price: 45, rating: 4.4, ratingCount: '2.2k', imageSeed: 'reg-turmeric-loose' },
  { id: 'reg-byadgi-loose', name: 'Byadgi Chilli (Loose)', localName: 'Byadgi Menasu', weight: '250 g', price: 90, rating: 4.6, ratingCount: '1.9k', imageSeed: 'reg-byadgi-loose' },
  { id: 'reg-jaggery-loose', name: 'Jaggery (Loose)', localName: 'Bella', weight: '500 g', price: 55, rating: 4.5, ratingCount: '3.0k', imageSeed: 'reg-jaggery-loose' },
  { id: 'reg-coriander-loose', name: 'Coriander Seeds (Loose)', localName: 'Kottambari Beeja', weight: '250 g', price: 38, rating: 4.3, ratingCount: '1.1k', imageSeed: 'reg-coriander-loose' },
];

// "Regional Sweets & Snacks" — high-frequency, emotionally local.
export const REGIONAL_SNACK_PRODUCTS: Product[] = [
  { id: 'reg-mangalore-bun', name: 'Mangalore Buns', localName: 'Bunns', weight: '4 pc', price: 50, rating: 4.7, ratingCount: '5.4k', imageSeed: 'reg-mangalore-bun' },
  { id: 'reg-kori-rotti', name: 'Kori Rotti Mix', localName: 'Kori Rotti', weight: '300 g', price: 95, originalPrice: 110, rating: 4.6, ratingCount: '2.0k', imageSeed: 'reg-kori-rotti' },
  { id: 'reg-neer-dosa', name: 'Neer Dosa Batter Mix', localName: 'Neer Dosa Hittu', weight: '500 g', price: 65, rating: 4.5, ratingCount: '2.7k', imageSeed: 'reg-neer-dosa' },
  { id: 'reg-kane-fry-masala', name: 'Kane Fry Masala', localName: 'Kane Fry Pudi', weight: '100 g', price: 48, rating: 4.6, ratingCount: '1.4k', imageSeed: 'reg-kane-fry-masala' },
];

export interface LocalStore {
  id: string;
  name: string;
  story: string;
  area: string;
}

// "Meet Your Local Stores" — the trust/community-moat row (see the
// strategy discussion's §26 reference). Name + one-line story, not a
// product list — this row is about the merchant relationship itself.
export const LOCAL_STORES: LocalStore[] = [
  { id: 'store-ganesh-kirana', name: 'Ganesh Kirana Store', story: '30 years serving Kaup Market Junction', area: 'Kaup' },
  { id: 'store-udupi-daily-needs', name: 'Udupi Daily Needs', story: 'Family-run since 1998, known for fresh spices', area: 'Kaup Beach Road' },
  { id: 'store-anantha-provisions', name: 'Anantha Provision Store', story: 'The go-to for loose grains and pulses', area: 'Kaup' },
  { id: 'store-shetty-fish-mart', name: 'Shetty Fish Mart', story: 'Daily boat-fresh catch, three generations running', area: 'Outer Udupi' },
];

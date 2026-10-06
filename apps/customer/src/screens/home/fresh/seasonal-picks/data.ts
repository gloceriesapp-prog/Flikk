import { FRUIT_PREVIEW_PRODUCTS } from '../fruit-favourites/data';
import { VEGETABLE_PREVIEW_PRODUCTS } from '../everyday-vegetables/data';

interface SeasonalCollection {
  id: string;
  startsOn: string; // Inclusive YYYY-MM-DD, checked local season dates.
  endsOn: string;
  bounds: { south: number; north: number; west: number; east: number };
  productIds: string[];
}

// Populate with locally checked, date-bounded collections and actual catalogue IDs.
// Availability alone does not establish seasonality. No universal month rules.
export const SEASONAL_COLLECTIONS: SeasonalCollection[] = [];
export const SEASONAL_PREVIEW_PRODUCTS = [
  FRUIT_PREVIEW_PRODUCTS[4], VEGETABLE_PREVIEW_PRODUCTS[3],
  FRUIT_PREVIEW_PRODUCTS[3], VEGETABLE_PREVIEW_PRODUCTS[4],
  FRUIT_PREVIEW_PRODUCTS[2], VEGETABLE_PREVIEW_PRODUCTS[5],
];

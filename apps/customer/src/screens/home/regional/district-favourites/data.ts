import { REGIONAL_CATEGORIES } from '../shop-by-category/data';

// Editorial category balance, not a sales/popularity ranking. Stock and
// packaging photos must come from nearby shops' actual catalogue.
export const DISTRICT_FAVOURITE_GROUPS = REGIONAL_CATEGORIES.flatMap((category) => category.groups);
export const DISTRICT_FAVOURITES_LIMIT = 6;

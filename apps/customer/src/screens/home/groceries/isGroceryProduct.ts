import type { ApiProduct } from '../../../api/products';

const GROCERY_CATEGORY = /\b(grocer(?:y|ies)|rice|atta|flour|dal|pulses?|grains?|oil|ghee|masalas?|spices?|salt|sugar|jaggery|tea|coffee|breakfast|cereals?|snacks?|biscuits?|beverages?|drinks?|dairy|milk|bread|bakery|batters?|fruits?|vegetables?|produce|herbs?|organic|dry fruits|nuts)\b/i;

export function isGroceryProduct(product: ApiProduct): boolean {
  return GROCERY_CATEGORY.test(product.category);
}

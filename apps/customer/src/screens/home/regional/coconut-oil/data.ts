import type { ApiProduct } from '../../../../api/products';
import type { Product } from '../../products/types';

const COCONUT_OIL_NAME = /\b(coconut|nariyal|copra)(?:\s+(?:cooking|edible|virgin))?\s+oil\b/i;
const NON_FOOD = /\b(hair|skin|beauty|cosmetics?|massage|body|serum|shampoo|conditioner|soaps?|personal care)\b/i;
const FOOD_CATEGORY = /\b(grocer(?:y|ies)|pantry|oils?|edible|food|staples?|organic|cooking|regional)\b/i;

export function isEdibleCoconutOil(product: ApiProduct): boolean {
  const name = product.name.replace(/[-_]/g, ' ');
  return COCONUT_OIL_NAME.test(name) && !NON_FOOD.test(`${name} ${product.category}`) && (FOOD_CATEGORY.test(product.category) || /\b(edible|cooking|food grade)\b/i.test(name));
}

// Sample pack sizes/prices, without purity, origin or brand claims.
export const COCONUT_OIL_PREVIEWS: Product[] = [
  { id: 'coconut-oil-preview-250', name: 'Coconut Oil', localName: '', weight: '250 ml', price: 95, rating: 0, ratingCount: '', imageSeed: 'coconut-oil-250', isVeg: true },
  { id: 'coconut-oil-preview-500', name: 'Coconut Oil', localName: '', weight: '500 ml', price: 180, rating: 0, ratingCount: '', imageSeed: 'coconut-oil-500', isVeg: true },
  { id: 'coconut-oil-preview-1000', name: 'Coconut Oil', localName: '', weight: '1 L', price: 340, rating: 0, ratingCount: '', imageSeed: 'coconut-oil-1000', isVeg: true },
  { id: 'coconut-oil-preview-2000', name: 'Coconut Oil', localName: '', weight: '2 L', price: 650, rating: 0, ratingCount: '', imageSeed: 'coconut-oil-2000', isVeg: true },
];

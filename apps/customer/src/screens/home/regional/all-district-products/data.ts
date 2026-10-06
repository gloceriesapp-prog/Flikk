import type { Product } from '../../products/types';
import { REGIONAL_PREVIEW_PRODUCTS } from '../preview/data';

// Read-only examples used only when the live catalogue is empty.
export const DISTRICT_CATALOGUE_PREVIEWS: Product[] = [
  ...REGIONAL_PREVIEW_PRODUCTS,
  { id: 'district-preview-chakkuli', name: 'Chakkuli', localName: '', weight: '200 g', price: 65, rating: 0, ratingCount: '', imageSeed: 'chakkuli', isVeg: true },
  { id: 'district-preview-chikki', name: 'Peanut Chikki', localName: '', weight: '100 g', price: 40, rating: 0, ratingCount: '', imageSeed: 'peanut-chikki', isVeg: true },
  { id: 'district-preview-masala', name: 'Sambar Masala', localName: '', weight: '100 g', price: 55, rating: 0, ratingCount: '', imageSeed: 'sambar-masala', isVeg: true },
];

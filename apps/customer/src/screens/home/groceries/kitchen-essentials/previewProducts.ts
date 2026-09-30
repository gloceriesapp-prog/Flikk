import type { Product } from '../../products/types';

// Temporary design samples requested for the Kitchen Essentials preview.
// They have no seller or purchasable identity and must remain read-only.
export const KITCHEN_PREVIEW_PRODUCTS: Product[] = [
  { id: 'kitchen-preview-rice', name: 'Sona Masoori Rice', localName: '', weight: '1 kg', price: 68, originalPrice: 75, rating: 0, ratingCount: '', imageSeed: 'rice', isVeg: true },
  { id: 'kitchen-preview-atta', name: 'Whole Wheat Atta', localName: '', weight: '1 kg', price: 55, originalPrice: 62, rating: 0, ratingCount: '', imageSeed: 'atta', isVeg: true },
  { id: 'kitchen-preview-dal', name: 'Toor Dal', localName: '', weight: '500 g', price: 89, originalPrice: 99, rating: 0, ratingCount: '', imageSeed: 'dal', isVeg: true },
];

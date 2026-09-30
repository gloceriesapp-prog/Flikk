import type { Product } from '../../products/types';

// Temporary, read-only samples to preview the six-card layout. These are
// not database listings; the shared collection labels them as design samples.
export const SNACKS_PREVIEW_PRODUCTS: Product[] = [
  { id: 'snacks-preview-biscuits', name: 'Butter Biscuits', localName: '', weight: '200 g', price: 35, rating: 0, ratingCount: '', imageSeed: 'biscuits', isVeg: true },
  { id: 'snacks-preview-namkeen', name: 'Classic Namkeen', localName: '', weight: '200 g', price: 55, rating: 0, ratingCount: '', imageSeed: 'namkeen', isVeg: true },
  { id: 'snacks-preview-chips', name: 'Salted Potato Chips', localName: '', weight: '90 g', price: 30, rating: 0, ratingCount: '', imageSeed: 'chips', isVeg: true },
  { id: 'snacks-preview-juice', name: 'Orange Juice', localName: '', weight: '1 L', price: 110, rating: 0, ratingCount: '', imageSeed: 'juice', isVeg: true },
  { id: 'snacks-preview-cola', name: 'Cola Drink', localName: '', weight: '750 ml', price: 40, rating: 0, ratingCount: '', imageSeed: 'cola', isVeg: true },
  { id: 'snacks-preview-water', name: 'Coconut Water', localName: '', weight: '200 ml', price: 45, rating: 0, ratingCount: '', imageSeed: 'coconut-water', isVeg: true },
];

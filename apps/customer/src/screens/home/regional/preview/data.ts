import type { Product } from '../../products/types';

// Design-only examples, never purchasable or attributed to real brands/stores.
export const REGIONAL_PREVIEW_PRODUCTS: Product[] = [
  { id: 'regional-preview-chips', name: 'Banana Chips', localName: '', weight: '200 g', price: 60, originalPrice: 75, rating: 0, ratingCount: '', imageSeed: 'banana-chips', isVeg: true },
  { id: 'regional-preview-sweet', name: 'Mysore Pak', localName: '', weight: '250 g', price: 120, originalPrice: 150, rating: 0, ratingCount: '', imageSeed: 'mysore-pak', isVeg: true },
  { id: 'regional-preview-rice', name: 'Matta Rice', localName: '', weight: '1 kg', price: 65, originalPrice: 80, rating: 0, ratingCount: '', imageSeed: 'matta-rice', isVeg: true },
  { id: 'regional-preview-spice', name: 'Chutney Pudi', localName: '', weight: '100 g', price: 45, originalPrice: 60, rating: 0, ratingCount: '', imageSeed: 'chutney-pudi', isVeg: true },
  { id: 'regional-preview-drink', name: 'Kokum Drink', localName: '', weight: '250 ml', price: 35, originalPrice: 45, rating: 0, ratingCount: '', imageSeed: 'kokum', isVeg: true },
  { id: 'regional-preview-pickle', name: 'Mango Pickle', localName: '', weight: '200 g', price: 70, originalPrice: 90, rating: 0, ratingCount: '', imageSeed: 'mango-pickle', isVeg: true },
];

export const DISCOVERY_PREVIEW_PRODUCTS = [
  { ...REGIONAL_PREVIEW_PRODUCTS[3], explanation: 'Sample description: a dry chutney powder served alongside everyday meals.' },
  { ...REGIONAL_PREVIEW_PRODUCTS[4], explanation: 'Sample description: a drink made with kokum fruit.' },
  { ...REGIONAL_PREVIEW_PRODUCTS[1], explanation: 'Sample description: a sweet made with gram flour, ghee and sugar.' },
];

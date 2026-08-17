// Placeholder content for the "Everyday essentials" row. Same caveat as
// every other placeholder dataset in screens/home/ — no real catalog
// backend behind this yet, see specs/01-customer-app/screens.md for what
// replaces it. ratingCount uses "lac"/"k" mixed the same way the reference
// screenshot does — not a typo, real Indian grocery apps show whichever
// reads shorter for the number.

import type { Product } from '../products/types';

export const EVERYDAY_ESSENTIALS_PRODUCTS: Product[] = [
  { id: 'nandini-curd', name: 'Nandini Pouch Curd', localName: 'Mosaru', weight: '500 g', price: 28, rating: 4.5, ratingCount: '1.2 lac', imageSeed: 'essential-curd' },
  { id: 'nandini-milk', name: 'Nandini Toned Milk', localName: 'Haalu', weight: '500 ml', price: 24, rating: 4.4, ratingCount: '1.1 lac', imageSeed: 'essential-milk' },
  { id: 'onion', name: 'Onion', localName: 'Eerulli', weight: '1 kg', price: 34, originalPrice: 39, rating: 4.2, ratingCount: '85k', imageSeed: 'essential-onion' },
  { id: 'toor-dal', name: 'Toor Dal', localName: 'Togari Bele', weight: '1 kg', price: 165, originalPrice: 185, rating: 4.6, ratingCount: '62k', imageSeed: 'essential-toor-dal' },
  { id: 'sunflower-oil', name: 'Sunflower Oil', localName: 'Sooryakanti Enne', weight: '1 L', price: 145, rating: 4.5, ratingCount: '48k', imageSeed: 'essential-oil' },
];

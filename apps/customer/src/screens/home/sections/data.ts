// Placeholder catalog for the "All" tab's Today's Deal / Bestsellers sections.
// Same random-image, made-up-price approach as fish/data.ts — see that file's
// comment for why. Item names/local names match the convention seen in the
// reference UI (e.g. "Onion (Eerulli)").

import type { Product } from '../products/types';

export const TODAYS_DEAL_PRODUCTS: Product[] = [
  { id: 'nandini-curd', name: 'Nandini Pouch Curd', localName: 'Mosaru', weight: '500 g', price: 28, rating: 4.5, ratingCount: '1.2 lac', imageSeed: 'curd-1' },
  { id: 'nandini-milk', name: 'Nandini Toned Milk', localName: 'Haalu', weight: '500 ml', price: 24, rating: 4.4, ratingCount: '1.1 lac', imageSeed: 'milk-1' },
  { id: 'onion', name: 'Onion', localName: 'Eerulli', weight: '1 kg', price: 34, originalPrice: 39, rating: 4.2, ratingCount: '85k', imageSeed: 'onion-1' },
  { id: 'green-chilli', name: 'Green Chilli', localName: 'Menasinakayi', weight: '100 g', price: 11, originalPrice: 12, rating: 4.1, ratingCount: '40k', imageSeed: 'chilli-1' },
  { id: 'potato', name: 'Potato', localName: 'Alugadde', weight: '1 kg', price: 27, originalPrice: 31, rating: 4.3, ratingCount: '92k', imageSeed: 'potato-1' },
  { id: 'coriander', name: 'Coriander Bunch', localName: 'Kottambari Soppu', weight: '100 g', price: 13, originalPrice: 16, rating: 4.0, ratingCount: '28k', imageSeed: 'coriander-1' },
];

export const BESTSELLER_PRODUCTS: Product[] = [
  { id: 'tomato', name: 'Tomato', localName: 'Tomato Hannu', weight: '1 kg', price: 30, rating: 4.3, ratingCount: '76k', imageSeed: 'tomato-1' },
  { id: 'basmati-rice', name: 'Basmati Rice', localName: 'Akki', weight: '1 kg', price: 95, originalPrice: 110, rating: 4.6, ratingCount: '54k', imageSeed: 'rice-1' },
  { id: 'toor-dal', name: 'Toor Dal', localName: 'Togari Bele', weight: '500 g', price: 68, rating: 4.4, ratingCount: '38k', imageSeed: 'dal-1' },
  { id: 'sunflower-oil', name: 'Sunflower Oil', localName: 'Enne', weight: '1 L', price: 145, originalPrice: 160, rating: 4.5, ratingCount: '61k', imageSeed: 'oil-1' },
  { id: 'banana', name: 'Banana', localName: 'Balehannu', weight: '1 dozen', price: 42, rating: 4.2, ratingCount: '49k', imageSeed: 'banana-1' },
  { id: 'ghee', name: 'Cow Ghee', localName: 'Tuppa', weight: '500 ml', price: 320, originalPrice: 350, rating: 4.7, ratingCount: '31k', imageSeed: 'ghee-1' },
];

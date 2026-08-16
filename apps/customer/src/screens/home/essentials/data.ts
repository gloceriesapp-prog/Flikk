// Placeholder content for the "Essentials" category tab. Same caveat as
// every other placeholder dataset in screens/home/ — no real catalog backend
// behind this yet, see specs/01-customer-app/screens.md for what replaces it.

import type { Product } from '../products/types';
import type { SubCategory } from '../category-tab/types';

export const ESSENTIALS_SUBCATEGORIES: SubCategory[] = [
  { id: 'cleaning-essentials', label: 'Cleaning Essentials', imageSeed: 'ess-cleaning' },
  { id: 'personal-care', label: 'Personal Care', imageSeed: 'ess-personal' },
  { id: 'home-care', label: 'Home Care', imageSeed: 'ess-home' },
  { id: 'laundry-care', label: 'Laundry Care', imageSeed: 'ess-laundry' },
  { id: 'paper-hygiene', label: 'Paper & Hygiene', imageSeed: 'ess-paper' },
  { id: 'pest-control', label: 'Pest Control', imageSeed: 'ess-pest' },
  { id: 'air-fresheners', label: 'Air Fresheners', imageSeed: 'ess-air' },
  { id: 'kitchen-essentials', label: 'Kitchen Essentials', imageSeed: 'ess-kitchen' },
];

export const ESSENTIALS_PRODUCTS: Product[] = [
  { id: 'dishwash-liquid', name: 'Dishwash Liquid', localName: 'Pathre Sopu', weight: '500 ml', price: 85, rating: 4.3, ratingCount: '6.8k', imageSeed: 'ess-dishwash' },
  { id: 'toilet-cleaner', name: 'Toilet Cleaner', localName: 'Bathroom Clean', weight: '500 ml', price: 95, originalPrice: 110, rating: 4.2, ratingCount: '4.5k', imageSeed: 'ess-toilet-cleaner' },
  { id: 'hand-sanitizer', name: 'Hand Sanitizer', localName: 'Kai Sopu', weight: '200 ml', price: 55, rating: 4.4, ratingCount: '3.9k', imageSeed: 'ess-sanitizer' },
  { id: 'tissue-rolls', name: 'Tissue Rolls', localName: 'Paper Roll', weight: '4 pc', price: 120, originalPrice: 140, rating: 4.1, ratingCount: '2.7k', imageSeed: 'ess-tissue' },
];

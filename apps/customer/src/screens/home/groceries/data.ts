// Placeholder content for the "Groceries" category tab. Same caveat as every
// other placeholder dataset in screens/home/ — no real catalog backend behind
// this yet, see specs/01-customer-app/screens.md for what replaces it.

import type { Product } from '../products/types';
import type { SubCategory } from '../category-tab/types';

export const GROCERY_SUBCATEGORIES: SubCategory[] = [
  { id: 'fresh-fruits', label: 'Fresh fruits', imageSeed: 'sub-fruits' },
  { id: 'fresh-vegetable', label: 'Fresh vegetable', imageSeed: 'sub-veg' },
  { id: 'cuts-exotics', label: 'Cuts & exotics', imageSeed: 'sub-exotics' },
  { id: 'herbs-spice-mix', label: 'Herbs & spice mix', imageSeed: 'sub-herbs' },
  { id: 'dairy-plant-based', label: 'Dairy & plant-based', imageSeed: 'sub-dairy' },
  { id: 'meat-eggs-fish', label: 'Meat, eggs & fish', imageSeed: 'sub-meat' },
  { id: 'healthy-organic', label: 'Healthy & organic', imageSeed: 'sub-organic' },
  { id: 'breads-batters', label: 'Breads & batters', imageSeed: 'sub-breads' },
];

export const FARM_PRODUCTS: Product[] = [
  { id: 'farm-tomatoes', name: 'Farm Fresh Tomatoes', localName: 'Tomato Hannu', weight: '1 kg', price: 32, rating: 4.4, ratingCount: '18k', imageSeed: 'farm-tomatoes' },
  { id: 'farm-spinach', name: 'Organic Spinach', localName: 'Palak Soppu', weight: '250 g', price: 22, originalPrice: 26, rating: 4.3, ratingCount: '9.2k', imageSeed: 'farm-spinach' },
  { id: 'farm-eggs', name: 'Free-range Eggs', localName: 'Motte', weight: '6 pc', price: 65, rating: 4.6, ratingCount: '22k', imageSeed: 'farm-eggs' },
  { id: 'farm-butter', name: 'Farm Butter', localName: 'Benne', weight: '200 g', price: 110, originalPrice: 125, rating: 4.5, ratingCount: '11k', imageSeed: 'farm-butter' },
];

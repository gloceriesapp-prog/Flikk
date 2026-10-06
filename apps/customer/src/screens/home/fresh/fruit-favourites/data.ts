import type { Product } from '../../products/types';
import { FRESH_CATEGORIES } from '../shop-fresh/data';

export const FRUIT_GROUPS = FRESH_CATEGORIES.find((category) => category.id === 'fruits')!.groups;
export const FRUIT_PREVIEW_PRODUCTS: Product[] = [
  { id: 'fruit-preview-banana', name: 'Bananas', localName: '', weight: '6 pc', price: 45, rating: 0, ratingCount: '', imageSeed: 'banana', isVeg: true },
  { id: 'fruit-preview-apple', name: 'Apples', localName: '', weight: '500 g', price: 110, rating: 0, ratingCount: '', imageSeed: 'apple', isVeg: true },
  { id: 'fruit-preview-orange', name: 'Oranges', localName: '', weight: '500 g', price: 65, rating: 0, ratingCount: '', imageSeed: 'orange', isVeg: true },
  { id: 'fruit-preview-papaya', name: 'Papaya', localName: '', weight: '1 pc', price: 55, rating: 0, ratingCount: '', imageSeed: 'papaya', isVeg: true },
  { id: 'fruit-preview-guava', name: 'Guava', localName: '', weight: '500 g', price: 50, rating: 0, ratingCount: '', imageSeed: 'guava', isVeg: true },
  { id: 'fruit-preview-grapes', name: 'Grapes', localName: '', weight: '500 g', price: 80, rating: 0, ratingCount: '', imageSeed: 'grapes', isVeg: true },
];

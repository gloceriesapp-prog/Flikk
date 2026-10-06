import type { Product } from '../../products/types';
import { FRESH_CATEGORIES } from '../shop-fresh/data';

export const VEGETABLE_GROUPS = FRESH_CATEGORIES.find((category) => category.id === 'vegetables')!.groups;
export const VEGETABLE_PREVIEW_PRODUCTS: Product[] = [
  { id: 'veg-preview-onion', name: 'Onions', localName: '', weight: '1 kg', price: 35, rating: 0, ratingCount: '', imageSeed: 'onion', isVeg: true },
  { id: 'veg-preview-tomato', name: 'Tomatoes', localName: '', weight: '500 g', price: 25, rating: 0, ratingCount: '', imageSeed: 'tomato', isVeg: true },
  { id: 'veg-preview-potato', name: 'Potatoes', localName: '', weight: '1 kg', price: 40, rating: 0, ratingCount: '', imageSeed: 'potato', isVeg: true },
  { id: 'veg-preview-carrot', name: 'Carrots', localName: '', weight: '500 g', price: 35, rating: 0, ratingCount: '', imageSeed: 'carrot', isVeg: true },
  { id: 'veg-preview-beans', name: 'French Beans', localName: '', weight: '250 g', price: 30, rating: 0, ratingCount: '', imageSeed: 'beans', isVeg: true },
  { id: 'veg-preview-brinjal', name: 'Brinjal', localName: '', weight: '500 g', price: 28, rating: 0, ratingCount: '', imageSeed: 'brinjal', isVeg: true },
];

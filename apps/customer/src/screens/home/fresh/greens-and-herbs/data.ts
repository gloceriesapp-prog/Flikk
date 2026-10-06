import type { Product } from '../../products/types';
import { FRESH_CATEGORIES } from '../shop-fresh/data';

export const GREENS_AND_HERBS_GROUPS = FRESH_CATEGORIES.filter((category) => ['leafy-greens', 'herbs'].includes(category.id)).flatMap((category) => category.groups);
export const GREENS_PREVIEW_PRODUCTS: Product[] = [
  { id: 'greens-preview-spinach', name: 'Spinach', localName: '', weight: '250 g', price: 25, rating: 0, ratingCount: '', imageSeed: 'spinach', isVeg: true },
  { id: 'greens-preview-coriander', name: 'Coriander', localName: '', weight: '100 g', price: 15, rating: 0, ratingCount: '', imageSeed: 'coriander', isVeg: true },
  { id: 'greens-preview-curry', name: 'Curry Leaves', localName: '', weight: '50 g', price: 10, rating: 0, ratingCount: '', imageSeed: 'curry-leaves', isVeg: true },
  { id: 'greens-preview-mint', name: 'Mint', localName: '', weight: '100 g', price: 20, rating: 0, ratingCount: '', imageSeed: 'mint', isVeg: true },
  { id: 'greens-preview-amaranth', name: 'Amaranth Leaves', localName: '', weight: '250 g', price: 30, rating: 0, ratingCount: '', imageSeed: 'amaranth', isVeg: true },
  { id: 'greens-preview-methi', name: 'Methi Leaves', localName: '', weight: '250 g', price: 30, rating: 0, ratingCount: '', imageSeed: 'methi', isVeg: true },
];

// Placeholder content for the search screen. Same caveat as every other
// placeholder dataset in this codebase — no real catalog/search backend
// behind this yet, see specs/01-customer-app/screens.md.

import type { Product } from '../home/products/types';

export interface Store {
  id: string;
  name: string;
  imageSeed: string;
}

// Fictional local store names — not the real chains from the reference UI
// (Walmart, Carrefour, etc.), those are that app's actual partners, not
// Flikk's. Random images for now, per the ask — real store logos come once
// there's a real store-onboarding backend (specs/00-foundation/data-model.md
// has a `stores` table already; nothing wires it to this screen yet).
export const TOP_STORES: Store[] = [
  { id: 'shetty-stores', name: 'Shetty Stores', imageSeed: 'store-shetty' },
  { id: 'krishna-mart', name: 'Krishna Mart', imageSeed: 'store-krishna' },
  { id: 'coastal-fresh', name: 'Coastal Fresh', imageSeed: 'store-coastal' },
  { id: 'udupi-grocers', name: 'Udupi Grocers', imageSeed: 'store-udupi' },
  { id: 'bunts-bazaar', name: 'Bunts Bazaar', imageSeed: 'store-bunts' },
  { id: 'durga-stores', name: 'Sri Durga Stores', imageSeed: 'store-durga' },
];

export const MOST_SEARCHED_PRODUCTS: Product[] = [
  { id: 'green-chilli', name: 'Green Chilli', localName: 'Hari Mirch', weight: '95-105 g', price: 8, originalPrice: 25, rating: 4.1, ratingCount: '40k', imageSeed: 'search-chilli' },
  { id: 'tomato', name: 'Tomato', localName: 'Tomatar', weight: '450-550 g', price: 29, originalPrice: 45, rating: 4.3, ratingCount: '76k', imageSeed: 'search-tomato' },
  { id: 'ginger', name: 'Ginger', localName: 'Adrak', weight: '95-105 g', price: 17, originalPrice: 18, rating: 4.2, ratingCount: '31k', imageSeed: 'search-ginger' },
  { id: 'lemon', name: 'Lemon', localName: 'Nimbu', weight: '4 pc', price: 13, originalPrice: 16, rating: 4.0, ratingCount: '22k', imageSeed: 'search-lemon' },
  { id: 'button-mushroom', name: 'Button Mushroom', localName: 'Mushroom', weight: '200-220 g', price: 46, originalPrice: 85, rating: 4.4, ratingCount: '18k', imageSeed: 'search-mushroom' },
  { id: 'round-brinjal', name: 'Round Brinjal', localName: 'Bhanta', weight: '450-550 g', price: 28, originalPrice: 55, rating: 4.1, ratingCount: '14k', imageSeed: 'search-round-brinjal' },
  { id: 'raw-banana', name: 'Raw Banana', localName: 'Kacha Kela', weight: '6 pc', price: 18, originalPrice: 42, rating: 4.3, ratingCount: '27k', imageSeed: 'search-raw-banana' },
  { id: 'sponge-gourd', name: 'Sponge Gourd', localName: 'Nenua/Tori', weight: '500 g', price: 16, originalPrice: 34, rating: 4.0, ratingCount: '9k', imageSeed: 'search-sponge-gourd' },
  { id: 'long-brinjal', name: 'Long Brinjal', localName: 'Baingan', weight: '450-550 g', price: 23, originalPrice: 40, rating: 4.2, ratingCount: '12k', imageSeed: 'search-long-brinjal' },
];

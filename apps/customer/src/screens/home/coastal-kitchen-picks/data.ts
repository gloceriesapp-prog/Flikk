// Placeholder content for the "Coastal Kitchen picks" row — coastal
// Karnataka kitchen staples specifically, not a generic grocery mix. Same
// caveat as every other placeholder dataset in screens/home/: no real
// catalog backend behind this yet, see specs/01-customer-app/screens.md.

import type { Product } from '../products/types';

export const COASTAL_KITCHEN_PICKS_PRODUCTS: Product[] = [
  { id: 'coconut', name: 'Fresh Coconut', localName: 'Tenginakayi', weight: '1 pc', price: 30, rating: 4.5, ratingCount: '32k', imageSeed: 'coastal-coconut' },
  { id: 'fish-curry-masala', name: 'Fish Curry Masala', localName: 'Meen Pudi', weight: '100 g', price: 42, originalPrice: 50, rating: 4.6, ratingCount: '14k', imageSeed: 'coastal-fish-masala' },
  { id: 'tamarind', name: 'Tamarind', localName: 'Huli', weight: '250 g', price: 35, rating: 4.3, ratingCount: '9.8k', imageSeed: 'coastal-tamarind' },
  { id: 'kokum', name: 'Kokum', localName: 'Punarpuli', weight: '100 g', price: 55, originalPrice: 65, rating: 4.4, ratingCount: '3.2k', imageSeed: 'coastal-kokum' },
  { id: 'byadgi-chilli', name: 'Byadgi Chilli', localName: 'Byadgi Menasu', weight: '200 g', price: 68, rating: 4.7, ratingCount: '11k', imageSeed: 'coastal-byadgi-chilli' },
];

// Placeholder catalog for the Fresh Fish category tab. Names pair the English
// name with the local coastal-Karnataka name, matching the convention already
// used in the reference UI (e.g. "Onion (Eerulli)"). Images are random
// (picsum.photos, seeded per item for a stable placeholder) until real store
// catalog data exists — see specs/01-customer-app/screens.md for the real
// catalog-browse build (PRD C4/C5), which is what eventually replaces this.

import type { Product } from '../products/types';

export const FISH_PRODUCTS: Product[] = [
  { id: 'mackerel', name: 'Mackerel', localName: 'Bangude', weight: '500 g', price: 180, originalPrice: 200, rating: 4.3, ratingCount: '2.1k', imageSeed: 'mackerel-1' },
  { id: 'sardine', name: 'Sardine', localName: 'Bootai', weight: '500 g', price: 120, rating: 4.1, ratingCount: '1.8k', imageSeed: 'sardine-1' },
  { id: 'pomfret', name: 'Pomfret', localName: 'Halwa', weight: '500 g', price: 450, originalPrice: 500, rating: 4.6, ratingCount: '980', imageSeed: 'pomfret-1' },
  { id: 'anchovy', name: 'Anchovy', localName: 'Bolthare', weight: '250 g', price: 90, rating: 4.0, ratingCount: '640', imageSeed: 'anchovy-1' },
  { id: 'kingfish', name: 'Kingfish', localName: 'Anjal', weight: '500 g', price: 600, rating: 4.7, ratingCount: '1.4k', imageSeed: 'kingfish-1' },
  { id: 'prawns', name: 'Prawns', localName: 'Sungta', weight: '250 g', price: 350, originalPrice: 400, rating: 4.5, ratingCount: '3.2k', imageSeed: 'prawns-1' },
  { id: 'crab', name: 'Crab', localName: 'Ediru', weight: '500 g', price: 280, rating: 4.2, ratingCount: '710', imageSeed: 'crab-1' },
  { id: 'squid', name: 'Squid', localName: 'Bondas', weight: '500 g', price: 320, rating: 4.4, ratingCount: '890', imageSeed: 'squid-1' },
  { id: 'tuna', name: 'Tuna', localName: 'Choodi', weight: '500 g', price: 250, rating: 4.1, ratingCount: '560', imageSeed: 'tuna-1' },
  { id: 'seer-fish', name: 'Seer Fish', localName: 'Surmai', weight: '500 g', price: 550, originalPrice: 600, rating: 4.8, ratingCount: '2.6k', imageSeed: 'seerfish-1' },
  { id: 'ladyfish', name: 'Ladyfish', localName: 'Kane', weight: '500 g', price: 400, rating: 4.3, ratingCount: '470', imageSeed: 'ladyfish-1' },
  { id: 'bombay-duck', name: 'Bombay Duck', localName: 'Bombil', weight: '500 g', price: 150, rating: 4.0, ratingCount: '390', imageSeed: 'bombayduck-1' },
];

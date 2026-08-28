// TEMPORARY preview-only fallback — real products are thin right now (a
// couple of Inventory entries), not enough to see the 4-row card layout
// properly. Used ONLY when the real feed (catalog/deals) has fewer than 4
// items, purely so the UI can be eyeballed at full size; never overrides
// real data once enough of it exists. Delete this file (and the fallback
// calls in MostBoughtSection.tsx) once admin's Inventory has a real
// catalog — this is explicitly not meant to ship long-term.

import type { Product } from '../products/types';

function dummy(id: string, name: string, weight: string, price: number, originalPrice: number | undefined, uri: string): Product {
  return { id, name, localName: '', weight, price, originalPrice, rating: 0, ratingCount: '', imageSeed: id, imageUrl: uri, isVeg: true };
}

export const DUMMY_MOST_BOUGHT: Product[] = [
  dummy('dummy-onion', 'Onion', '1 kg', 24, 40, 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=200&q=80'),
  dummy('dummy-tomato', 'Tomato', '1 kg', 19, 22, 'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=200&q=80'),
  dummy('dummy-potato', 'Potato', '1 kg', 27, 31, 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=200&q=80'),
  dummy('dummy-curd', 'Nandini Curd', '500 g', 28, undefined, 'https://images.unsplash.com/photo-1571212515416-fca325e5eec7?w=200&q=80'),
];

export const DUMMY_BEST_DEALS: Product[] = [
  dummy('dummy-milk', 'Toned Milk', '500 ml', 24, 28, 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=200&q=80'),
  dummy('dummy-bread', 'Brown Bread', '400 g', 38, 45, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200&q=80'),
  dummy('dummy-eggs', 'Farm Eggs', '6 pcs', 42, 52, 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=200&q=80'),
  dummy('dummy-banana', 'Banana', '1 dozen', 42, 48, 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=200&q=80'),
];

export const DUMMY_FRESH_PICKS: Product[] = [
  dummy('dummy-coriander', 'Coriander', '100 g', 13, 16, 'https://images.unsplash.com/photo-1600231682920-8ee5a8e59f51?w=200&q=80'),
  dummy('dummy-chilli', 'Green Chilli', '100 g', 11, 12, 'https://images.unsplash.com/photo-1583119022894-919a68a3d0e3?w=200&q=80'),
  dummy('dummy-carrot', 'Carrot', '500 g', 22, 26, 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=200&q=80'),
  dummy('dummy-spinach', 'Spinach', '250 g', 17, 20, 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=200&q=80'),
];

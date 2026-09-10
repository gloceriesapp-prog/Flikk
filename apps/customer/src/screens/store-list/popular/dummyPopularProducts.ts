// TEMPORARY preview-only fallback — same convention as apps/customer/src/
// screens/home/most-bought/dummyPreviewProducts.ts: real per-store deals
// are thin right now (most stores have zero discounted products on file),
// not enough to see the 4-row panel layout properly. Used ONLY when a
// store's real deals feed comes back empty, purely so the UI can be
// eyeballed at full size; never overrides real data once a store actually
// has some. Delete this file (and the fallback in PopularStorePanel.tsx)
// once admin's Inventory has real per-store discounts on file — this is
// explicitly not meant to ship long-term.

import type { Product } from '../../home/products/types';

function dummy(id: string, name: string, weight: string, price: number, originalPrice: number, uri: string): Product {
  return { id, name, localName: '', weight, price, originalPrice, rating: 0, ratingCount: '', imageSeed: id, imageUrl: uri, isVeg: true };
}

export const DUMMY_POPULAR_PRODUCTS: Product[] = [
  dummy('dummy-popular-atta', 'Aashirvaad Atta', '5 kg', 249, 289, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200&q=80'),
  dummy('dummy-popular-oil', 'Fortune Sunflower Oil', '1 L', 139, 165, 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=200&q=80'),
  dummy('dummy-popular-rice', 'India Gate Basmati Rice', '1 kg', 89, 110, 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=200&q=80'),
  dummy('dummy-popular-tea', 'Tata Tea Gold', '250 g', 118, 140, 'https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?w=200&q=80'),
];

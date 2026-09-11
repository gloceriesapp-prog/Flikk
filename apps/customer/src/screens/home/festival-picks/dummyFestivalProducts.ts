// TEMPORARY preview-only fallback — same convention as store-list/popular/
// dummyPopularProducts.ts and groceries/components/dummyBrandSpotlightProducts.ts:
// no real "festival picks" feed exists in the schema yet (no per-store
// festival-tag concept for admin's Inventory screen to set), so this stands
// in purely to preview FestivalPicksSection's layout at full size. Real,
// plausible Ganesh Chaturthi staples (matches the same category grid
// already shown on the "All" tab's own promo banner: Modak & Prasad, Pooja
// Essentials, Banana Leaves, Sweets & Jaggery) — not generic filler. Delete
// once a real per-store festival-items feed exists to read from instead.

import type { Product } from '../products/types';

function dummy(id: string, name: string, weight: string, price: number, originalPrice: number, uri: string): Product {
  return { id, name, localName: '', weight, price, originalPrice, rating: 0, ratingCount: '', imageSeed: id, imageUrl: uri, isVeg: true };
}

export const DUMMY_FESTIVAL_PRODUCTS: Product[] = [
  dummy('dummy-festival-modak-flour', 'Modak Rice Flour', '500 g', 65, 80, 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=300&q=80'),
  dummy('dummy-festival-banana-leaf', 'Fresh Banana Leaves', '4 pcs', 40, 50, 'https://images.unsplash.com/photo-1585059895524-72359e06133a?w=300&q=80'),
  dummy('dummy-festival-jaggery', 'Organic Jaggery Block', '500 g', 55, 65, 'https://images.unsplash.com/photo-1631206753348-db44968fd1d4?w=300&q=80'),
  dummy('dummy-festival-coconut', 'Fresh Coconut', '2 pcs', 48, 60, 'https://images.unsplash.com/photo-1580984969071-a8da5656c2fb?w=300&q=80'),
  dummy('dummy-festival-agarbatti', 'Pooja Agarbatti Pack', '1 pack', 35, 45, 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=300&q=80'),
  dummy('dummy-festival-flowers', 'Fresh Pooja Flowers', '1 bunch', 60, 75, 'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?w=300&q=80'),
];

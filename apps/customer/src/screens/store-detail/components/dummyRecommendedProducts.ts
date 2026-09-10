// TEMPORARY preview-only fallback — same convention as store-list/popular/
// dummyPopularProducts.ts and this folder's own dummyStoreCategories.ts:
// a real "recommended for you" ranking needs real per-customer signal this
// app doesn't compute yet, so this stands in purely to preview
// StoreRecommendedSection's layout at full size. Delete once a real
// recommendation source exists.

import type { Product } from '../../home/products/types';

function dummy(id: string, name: string, weight: string, price: number, originalPrice: number, uri: string): Product {
  return { id, name, localName: '', weight, price, originalPrice, rating: 0, ratingCount: '', imageSeed: id, imageUrl: uri, isVeg: true };
}

export const DUMMY_RECOMMENDED_PRODUCTS: Product[] = [
  dummy('dummy-rec-milk', 'Amul Toned Milk', '500 ml', 27, 30, 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300&q=80'),
  dummy('dummy-rec-bread', 'Britannia Brown Bread', '400 g', 45, 55, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300&q=80'),
  dummy('dummy-rec-eggs', 'Farm Fresh Eggs', '6 pcs', 42, 48, 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=300&q=80'),
  dummy('dummy-rec-banana', 'Robusta Banana', '1 dozen', 48, 60, 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=300&q=80'),
  dummy('dummy-rec-curd', 'Nandini Curd', '400 g', 32, 38, 'https://images.unsplash.com/photo-1571212515416-fca988083b73?w=300&q=80'),
  dummy('dummy-rec-tomato', 'Fresh Tomato', '1 kg', 35, 42, 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&q=80'),
];

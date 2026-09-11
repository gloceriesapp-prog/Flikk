// TEMPORARY preview-only fallback — same convention as store-list/popular/
// dummyPopularProducts.ts: BrandSpotlightSection has no real per-brand feed
// to read from yet (no such concept exists in the schema — a real version
// of this would need a "featured brand" flag admin's Inventory screen
// doesn't have), so this stands in purely to preview the section's layout
// at full size. Generic pantry-staple items, not a named real brand — this
// app has no actual brand-sponsorship relationship to represent, so
// inventing one (the reference's "Happilo") would be a fabricated claim,
// not just fabricated data. Delete once a real "featured products" source
// exists to read from instead.

import type { Product } from '../../products/types';

function dummy(id: string, name: string, weight: string, price: number, originalPrice: number, uri: string): Product {
  return { id, name, localName: '', weight, price, originalPrice, rating: 0, ratingCount: '', imageSeed: id, imageUrl: uri, isVeg: true };
}

export const DUMMY_BRAND_SPOTLIGHT_PRODUCTS: Product[] = [
  dummy('dummy-spotlight-cashew', 'Premium Whole Cashews', '200 g', 310, 335, 'https://images.unsplash.com/photo-1508061253366-f7da158b6d46?w=300&q=80'),
  dummy('dummy-spotlight-almond', 'Californian Almonds', '200 g', 278, 365, 'https://images.unsplash.com/photo-1508061235931-fb1ab5d18eb2?w=300&q=80'),
  dummy('dummy-spotlight-chia', 'Raw Authentic Chia Seeds', '200 g', 141, 150, 'https://images.unsplash.com/photo-1541864428146-fb0a2b968d97?w=300&q=80'),
  dummy('dummy-spotlight-makhana', 'Roasted Foxnuts (Makhana)', '100 g', 140, 215, 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=300&q=80'),
  dummy('dummy-spotlight-walnut', 'Premium Kashmiri Walnuts', '250 g', 320, 399, 'https://images.unsplash.com/photo-1596591868231-05e808fd3fbc?w=300&q=80'),
];

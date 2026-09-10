// TEMPORARY preview-only — same convention as screens/home/most-bought/
// dummyPreviewProducts.ts and screens/store-list/popular/
// dummyPopularProducts.ts: most real stores on file don't have
// address_line filled in yet (admin's Add Store form added that field
// later than the store rows themselves), so there was nothing real to
// eyeball the new 2-line-name + full-address card layout against. One
// clearly-fake store, appended to the real list (AllStoresSection.tsx),
// never replacing it. Delete this file (and the append in
// AllStoresSection.tsx) once real stores commonly have a full address on
// file.

import type { RealStore } from './useAllStores';

export const DUMMY_PREVIEW_STORE: RealStore = {
  id: 'dummy-preview-store',
  name: 'Sunrise Family Supermarket & General Stores (Preview)',
  category: 'Supermarket',
  isOpen: true,
  photoUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80',
  addressLine: '2nd Cross, Near Bus Stand, Kaup Beach Road',
  city: 'Udupi',
  district: 'Kaup',
  rating: 4.3,
  avgPrepMinutes: 18,
  openTime: '7:00 AM',
  closeTime: '9:30 PM',
};

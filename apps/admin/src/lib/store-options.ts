// Category list a founder picks from when onboarding a store — matches
// StoreDetailForm's own pre-existing list, kept here now that AddStoreModal
// needs the same set.
export const STORE_CATEGORIES = [
  'Kirana & Grocery',
  'Supermarket',
  'Pharmacy',
  'Bakery',
  'Fruits & Vegetables',
  'Hardware',
  'Paint Shop',
  'Steel & Vessels',
  'General Store',
  'Others',
] as const;

export type StoreCategory = (typeof STORE_CATEGORIES)[number];

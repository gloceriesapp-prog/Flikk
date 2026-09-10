// TEMPORARY preview-only dummy data — same convention as
// store-list/all-stores/dummyPreviewStore.ts and
// store-list/popular/dummyPopularProducts.ts: most real stores in this
// environment don't have enough distinct product categories yet to show
// what StoreCategoryGrid actually looks like with a full 3-per-row grid,
// so this stands in ONLY when a store's real category list is empty.
//
// Per an explicit ask: not an exhaustive department list — a short,
// catchy set of the bundled categories people actually shop by most on a
// grocery app's home/store screen (combined staples like "Atta, Rice &
// Dal" read as one real shopping habit, not a generic "Grocery" bucket).
// Delete once real store catalogs have enough real categories to preview
// against directly.

export interface DummyStoreCategory {
  id: string;
  label: string;
  imageUrl: string;
}

export const DUMMY_STORE_CATEGORIES: DummyStoreCategory[] = [
  { id: 'vegetables-fruits', label: 'Vegetables & Fruits', imageUrl: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=400' },
  { id: 'atta-rice-dal', label: 'Atta, Rice & Dal', imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400' },
  { id: 'dairy-bread-eggs', label: 'Dairy, Bread & Eggs', imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400' },
  { id: 'munchies', label: 'Munchies', imageUrl: 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=400' },
  { id: 'cold-drinks-juices', label: 'Cold Drinks & Juices', imageUrl: 'https://images.unsplash.com/photo-1595981267035-7b04ca84a82d?w=400' },
  { id: 'sweet-tooth', label: 'Sweet Tooth', imageUrl: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=400' },
];

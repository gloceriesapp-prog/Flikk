// Same "sidebar + product grid" shape as screens/category-detail/types.ts —
// kept as its own small type here rather than imported, since "category"
// and "store" are different domains that happen to share a UI pattern, not
// the same concept.

import type { Product } from '../home/products/types';

export interface StoreSubCategory {
  id: string;
  label: string;
}

export interface StoreDetailData {
  title: string;
  subCategories: StoreSubCategory[];
  // Keyed by StoreSubCategory.id — the grid shows whichever list matches
  // the sidebar item currently selected.
  productsBySubCategory: Record<string, Product[]>;
}

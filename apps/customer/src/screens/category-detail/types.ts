// Shared shape for the "sidebar + product grid" category-detail pattern —
// reused by every category tap (Home's category tabs, a groceries
// sub-category tile, a CategoriesScreen tile). Same UI, different content.

import type { Product } from '../home/products/types';

export interface DetailSubCategory {
  id: string;
  label: string;
}

export interface CategoryDetailData {
  title: string;
  subCategories: DetailSubCategory[];
  // Keyed by DetailSubCategory.id — the grid shows whichever list matches
  // the sidebar item currently selected.
  productsBySubCategory: Record<string, Product[]>;
}

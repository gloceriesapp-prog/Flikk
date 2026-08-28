// Shared shape for the "sidebar + product grid" category-detail pattern —
// reused by every category tap (Home's category tabs, a groceries
// sub-category tile, a CategoriesScreen tile). Same UI, different content.

import type { Product } from '../home/products/types';

export interface DetailSubCategory {
  id: string;
  label: string;
  // Real sub-categories carry a real photo (admin's own Categories screen
  // -> SubCategoryManager.tsx); the mock registry's "All" tile and
  // fallback content leave this unset, which SubCategorySidebarItem.tsx
  // already falls back to the shared placeholder image for.
  imageUrl?: string;
}

export interface CategoryDetailData {
  title: string;
  subCategories: DetailSubCategory[];
  // Keyed by DetailSubCategory.id — the grid shows whichever list matches
  // the sidebar item currently selected.
  productsBySubCategory: Record<string, Product[]>;
}

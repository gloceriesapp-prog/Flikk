// Real sub-categories + real products for one real category — admin's own
// Categories screen (categories/category_sections/sub_categories tables),
// not the static registry.ts mock. CategoryDetailScreen.tsx tries this
// first; a category tapped from Home's older category tabs (string ids
// like 'fresh-fish' that were never real rows) simply gets zero
// sub-categories back and falls through to the mock registry untouched —
// no tile in the app becomes a dead end either way.

import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../api/client';
import { mapApiProduct, type ApiProduct } from '../../api/products';
import type { DetailSubCategory } from './types';

interface ApiSubCategory {
  id: string;
  name: string;
  image_url: string | null;
}

export function useRealSubCategories(categoryId: string) {
  return useQuery({
    queryKey: ['category-detail', 'subcategories', categoryId],
    queryFn: async () => {
      const rows = await apiRequest<ApiSubCategory[]>(`/categories/${categoryId}/subcategories`, { auth: false });
      return rows.map((row): DetailSubCategory => ({ id: row.id, label: row.name, imageUrl: row.image_url ?? undefined }));
    },
  });
}

// "All" tab — every product under any of this category's sub-categories.
export function useCategoryProducts(categoryId: string) {
  return useQuery({
    queryKey: ['category-detail', 'products', categoryId],
    enabled: Boolean(categoryId),
    queryFn: async () => {
      const rows = await apiRequest<ApiProduct[]>(`/categories/${categoryId}/products`, { auth: false });
      return rows.map(mapApiProduct);
    },
  });
}

// One specific sub-category tab.
export function useSubCategoryProducts(subCategoryId: string | undefined) {
  return useQuery({
    queryKey: ['category-detail', 'subcategory-products', subCategoryId],
    enabled: Boolean(subCategoryId),
    queryFn: async () => {
      const rows = await apiRequest<ApiProduct[]>(`/categories/subcategories/${subCategoryId}/products`, { auth: false });
      return rows.map(mapApiProduct);
    },
  });
}

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../api/client';
import { mapApiProduct, type ApiProduct } from '../../api/products';
import { useLocationStore } from '../../store/useLocationStore';
import type { DetailSubCategory } from './types';
import { DEFAULT_FILTERS, isRealCategoryId, type ProductFilters } from './filters/productFilters';
interface ApiSubCategory { id: string; name: string; image_url: string | null }
export function useRealSubCategories(categoryId: string) {
  return useQuery({ queryKey: ['category-detail', 'subcategories', categoryId], enabled: isRealCategoryId(categoryId), staleTime: 60000,
    queryFn: async () => (await apiRequest<ApiSubCategory[]>(`/categories/${categoryId}/subcategories`, { auth: false }))
      .map((row): DetailSubCategory => ({ id: row.id, label: row.name, imageUrl: row.image_url ?? undefined })) });
}
interface BrowsePage { products: ApiProduct[]; nextCursor: string | null; facets: { types: string[]; brands: string[] } }
function useProducts(categoryId: string | undefined, subcategoryId: string | undefined, filters: ProductFilters) {
  const location = useLocationStore(s => s.location);
  return useInfiniteQuery({
    queryKey: ['category-detail', 'products', categoryId, subcategoryId, filters, location?.latitude, location?.longitude],
    enabled: Boolean(location && (isRealCategoryId(categoryId ?? '') || isRealCategoryId(subcategoryId ?? ''))),
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ sort: filters.sort, type: filters.type, brand: filters.brand,
        veg: filters.vegOnly ? '1' : '0', deals: filters.dealsOnly ? '1' : '0' });
      if (categoryId) params.set('category', categoryId);
      if (subcategoryId) params.set('subcategory', subcategoryId);
      if (pageParam) params.set('after', pageParam);
      const page = await apiRequest<BrowsePage>(`/browse/category?${params}`, { auth: false });
      return { ...page, products: page.products.map(mapApiProduct) };
    },
    getNextPageParam: page => page.nextCursor ?? undefined,
  });
}
export const useCategoryProducts = (id: string, filters = DEFAULT_FILTERS) => useProducts(id || undefined, undefined, filters);
export const useSubCategoryProducts = (id: string | undefined, filters = DEFAULT_FILTERS) => useProducts(undefined, id, filters);

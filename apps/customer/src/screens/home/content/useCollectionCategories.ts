import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../../api/client';
import type { ApiProduct } from '../../../api/products';
import { collectionSidebar, type CollectionCategory } from './collectionSidebar';

interface CategoryRow { id: string; name: string; image_url?: string | null }
// Resolve labels from the catalogue, never from a tile's legacy ID or its title.
export function useCollectionCategories(products: ApiProduct[], allowedIds: string[]) {
  const client = useQueryClient();
  const parents = [...new Set(products.map(product => product.category))].sort();
  const query = useQuery({
    queryKey: ['home', 'collection-sidebar-v2', parents, [...allowedIds].sort()],
    enabled: parents.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const categories = await client.fetchQuery({ queryKey: ['catalogue', 'parent-categories'], staleTime: 300_000,
        queryFn: () => apiRequest<CategoryRow[]>('/categories', { auth: false }) });
      const groups = await Promise.all(categories.filter(category => parents.includes(category.name)).map(category =>
        client.fetchQuery({ queryKey: ['catalogue', 'subcategories-with-parent', category.id], staleTime: 60_000,
          queryFn: async () => (await apiRequest<CategoryRow[]>(`/categories/${category.id}/subcategories`, { auth: false }))
            .map((row): CollectionCategory => ({ id: row.id, label: row.name, parentId: category.id, imageUrl: row.image_url ?? undefined })) })));
      return groups.flat();
    },
  });
  return { ...query, data: query.data ? collectionSidebar(products, query.data, allowedIds) : undefined };
}

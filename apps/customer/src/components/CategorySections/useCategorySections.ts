// Real grouped categories (GET /category-sections, backend/src/routes/
// categorySections.ts) — one title (CategorySection, e.g. "Groceries &
// Staples") with a row of image+name category tiles underneath it, per an
// explicit ask. Both the title and every category under it are managed
// from admin's own Categories screen (apps/admin/src/app/(dashboard)/
// categories) — not the old CATEGORY_SECTIONS mock, which grouped a
// hardcoded, duplicated item set under fake titles that didn't correspond
// to anything a founder actually controlled.

import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../api/client';

export interface RemoteCategory {
  id: string;
  name: string;
  imageUrl?: string;
}

export interface RemoteCategorySection {
  id: string;
  name: string;
  categories: RemoteCategory[];
}

interface ApiCategorySection {
  id: string;
  name: string;
  categories: { id: string; name: string; image_url: string | null }[];
}

export function useCategorySections() {
  return useQuery({
    queryKey: ['category-sections'],
    queryFn: async () => {
      const rows = await apiRequest<ApiCategorySection[]>('/category-sections', { auth: false });
      return rows.map(
        (row): RemoteCategorySection => ({
          id: row.id,
          name: row.name,
          categories: row.categories.map((c) => ({ id: c.id, name: c.name, imageUrl: c.image_url ?? undefined })),
        }),
      );
    },
  });
}

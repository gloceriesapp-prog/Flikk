// Real, admin-added Home tabs (GET /home-tabs, backend/src/routes/homeTabs.ts)
// — curated extras a founder appends after the 4 hardcoded tabs in
// categoryTabs.ts (All/Groceries/Fresh/Meat & Fish/Bakery), managed from
// admin's own Home Categories screen. Deliberately separate from
// useCategorySections.ts (categories/category_sections) — same isolation
// this whole home_tabs/home_tab_tiles system was built for.

import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../../api/client';

export interface RemoteHomeTabTile {
  id: string;
  name: string;
  imageUrl?: string;
}

export interface RemoteHomeTab {
  id: string;
  name: string;
  tiles: RemoteHomeTabTile[];
}

interface ApiHomeTab {
  id: string;
  name: string;
  image_url: string | null;
  tiles: { id: string; name: string; image_url: string | null }[];
}

export function useHomeTabs() {
  return useQuery({
    queryKey: ['home-tabs'],
    queryFn: async () => {
      const rows = await apiRequest<ApiHomeTab[]>('/home-tabs', { auth: false });
      return rows.map(
        (row): RemoteHomeTab => ({
          id: row.id,
          name: row.name,
          tiles: row.tiles.map((t) => ({ id: t.id, name: t.name, imageUrl: t.image_url ?? undefined })),
        }),
      );
    },
  });
}

// Real, admin-added Home tabs (GET /home-tabs, backend/src/routes/homeTabs.ts)
// — curated extras a founder appends after the 4 hardcoded tabs in
// categoryTabs.ts (All/Groceries/Fresh/Meat & Fish/Bakery), managed from
// admin's own Home Categories screen. Deliberately separate from
// useCategorySections.ts (categories/category_sections) — same isolation
// this whole home_tabs/home_tab_tiles system was built for.
// Banners are the "ads and poster for different category" ask — a tab's
// own promo poster image(s), rendered via PosterBanner.tsx. Image only, no
// badge/heading/subheading text — per an explicit ask to drop the text
// entirely.

import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../../api/client';
import { useHomeContent } from '../content/useHomeContent';
import { mergeManagedTabs } from '../content/mergeTabs';
import type { HomeContentKey } from '../content/contracts';

// Admin links a tile to a real category/subcategory (home_tab_tiles.link_*,
// migration 097). categoryId is the parent category CategoryDetail opens.
export interface HomeTabTileLink {
  type: 'category' | 'subcategory';
  id: string;
  categoryId: string;
}

export interface RemoteHomeTabTile {
  id: string;
  name: string;
  imageUrl?: string;
  link?: HomeTabTileLink;
}

export interface RemoteHomeTabBanner {
  id: string;
  imageUrl: string;
}

export interface RemoteHomeTab {
  id: string;
  name: string;
  tiles: RemoteHomeTabTile[];
  banners: RemoteHomeTabBanner[];
  contentKey?: HomeContentKey;
  label?: string;
}

interface ApiHomeTab {
  id: string;
  name: string;
  image_url: string | null;
  tiles: { id: string; name: string; image_url: string | null; link?: { type: 'category' | 'subcategory'; id: string; category_id: string } | null }[];
  banners: { id: string; image_url: string }[];
}

export function useHomeTabs() {
  const content = useHomeContent();
  const query = useQuery({
    staleTime: 300_000,
    gcTime: 30 * 60_000,
    queryKey: ['home-tabs'],
    queryFn: async () => {
      const rows = await apiRequest<ApiHomeTab[]>('/home-tabs', { auth: false });
      return rows.map(
        (row): RemoteHomeTab => ({
          id: row.id,
          name: row.name,
          tiles: row.tiles.map((t) => ({ id: t.id, name: t.name, imageUrl: t.image_url ?? undefined,
            link: t.link ? { type: t.link.type, id: t.link.id, categoryId: t.link.category_id } : undefined })),
          banners: row.banners.map((b) => ({ id: b.id, imageUrl: b.image_url })),
        }),
      );
    },
  });
  return {
    ...query,
    data: mergeManagedTabs(query.data ?? [], content.data),
    // Dedicated category routes resolve IDs against both sources. A missing
    // managed tab is not "removed" while its content config is still loading.
    isResolvingTabs: query.isPending || content.isPending,
    hasTabLoadError: query.isError || content.isError,
    retryTabs: () => {
      void query.refetch();
      void content.refetch();
    },
  };
}

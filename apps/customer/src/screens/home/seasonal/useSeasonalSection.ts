// GET /home/seasonal-section (public, cached) — the admin Seasonal Section
// (seasonal_banner + seasonal_tiles, migration 040): an optional poster and
// up to four active tiles. Same react-query + home realtime invalidation as
// the other admin-driven Home feeds (useHomeContent.ts).

import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../../api/client';

export interface SeasonalTile {
  id: string;
  title: string;
  imageUrl: string | null;
  bgColor: string;
}

export interface SeasonalSectionData {
  bannerImageUrl: string | null;
  tiles: SeasonalTile[];
}

export const SEASONAL_SECTION_QUERY_KEY = ['home', 'seasonal-section'] as const;

const HEX = /^#[0-9a-f]{6}$/i;

export function mapSeasonalSection(body: Partial<SeasonalSectionData> | null | undefined): SeasonalSectionData {
  const banner = typeof body?.bannerImageUrl === 'string' && /^https:\/\//i.test(body.bannerImageUrl) ? body.bannerImageUrl : null;
  const tiles = (Array.isArray(body?.tiles) ? body.tiles : [])
    .filter((tile): tile is SeasonalTile => !!tile && typeof tile.id === 'string' && typeof tile.title === 'string' && tile.title.trim() !== '')
    .map((tile) => ({
      id: tile.id,
      title: tile.title.trim(),
      imageUrl: typeof tile.imageUrl === 'string' && /^https:\/\//i.test(tile.imageUrl) ? tile.imageUrl : null,
      bgColor: typeof tile.bgColor === 'string' && HEX.test(tile.bgColor) ? tile.bgColor : '#F4F1EA',
    }))
    .slice(0, 4);
  return { bannerImageUrl: banner, tiles };
}

export function useSeasonalSection() {
  return useQuery({
    staleTime: 300_000,
    gcTime: 30 * 60_000,
    queryKey: SEASONAL_SECTION_QUERY_KEY,
    queryFn: async () => mapSeasonalSection(await apiRequest<SeasonalSectionData>('/home/seasonal-section', { auth: false })),
  });
}

// GET /home/seasonal-section (backend/src/routes/homeSeasonalSection.ts) —
// the admin-curated poster+tile grid (apps/admin's own Seasonal Tiles
// screen). Replaces the old hardcoded SEASONAL_TILES/SEASONAL_BANNER_URI
// in this folder's own data.ts, which had zero admin control. Same
// react-query pattern as ../festival-picks/useFestivalSection.ts.

import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../../api/client';

export interface SeasonalTile {
  id: string;
  title: string;
  imageUrl: string | null;
  bgColor: string;
}

interface ApiSeasonalSection {
  bannerImageUrl: string | null;
  tiles: SeasonalTile[];
}

export function useSeasonalSection() {
  return useQuery({
    queryKey: ['home', 'seasonal-section'],
    queryFn: () => apiRequest<ApiSeasonalSection>('/home/seasonal-section', { auth: false }),
  });
}

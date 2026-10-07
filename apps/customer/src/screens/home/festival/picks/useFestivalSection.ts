// GET /home/festival-section (public, cached) — the admin Festival Section
// (festival_sections + festival_section_products, migration 018): a title
// and the products the admin picked, approved and from active shops only.
// null when no section is active. Same react-query + home realtime
// invalidation as the other admin-driven Home feeds (useHomeContent.ts).

import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../../../api/client';
import { mapApiProduct, type ApiProduct } from '../../../../api/products';
import type { Product } from '../../products/types';

export interface FestivalSection {
  title: string;
  products: Product[];
}

export const FESTIVAL_SECTION_QUERY_KEY = ['home', 'festival-section'] as const;

export function mapFestivalSection(body: { title?: unknown; products?: unknown } | null): FestivalSection | null {
  if (!body || typeof body.title !== 'string' || !Array.isArray(body.products)) return null;
  const products = (body.products as (ApiProduct | null)[])
    .filter((row): row is ApiProduct => !!row && typeof row === 'object' && typeof row.id === 'string')
    .map(mapApiProduct);
  return { title: body.title.trim() || 'Festival picks', products };
}

export function useFestivalSection() {
  return useQuery({
    staleTime: 300_000,
    gcTime: 30 * 60_000,
    queryKey: FESTIVAL_SECTION_QUERY_KEY,
    queryFn: async () => mapFestivalSection(await apiRequest<{ title: string; products: ApiProduct[] } | null>('/home/festival-section', { auth: false })),
  });
}

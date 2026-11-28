// Products the hero rotates through: the server's (same in-stock rows its
// data check counted). While the server grid isn't answering, the most
// popular products near the customer that have a photo, from the query Home
// already loads (Trending), so no extra request.
// ponytail: fallback isn't filtered to the hero's categories (the app's
// Product has no category); the server list replaces it once live.
import { useMemo } from 'react';
import { usePopularProducts } from '../trending/useTrendingThisWeek';
import type { GridCard, ProductPeek } from './api';

export const HERO_PRODUCTS = 4;

export function useHeroProducts(hero: GridCard | null | undefined): ProductPeek[] {
  const popular = usePopularProducts(30);
  const fromServer = hero?.products;
  return useMemo(() => {
    if (fromServer?.length) return fromServer.slice(0, HERO_PRODUCTS);
    return (popular.data ?? []).filter((p) => p.imageUrl).slice(0, HERO_PRODUCTS).map((p) => ({
      id: p.id, name: p.name, price: p.price, imageUrl: p.imageUrl!,
      mrp: p.originalPrice != null && p.originalPrice > p.price ? p.originalPrice : null,
    }));
  }, [fromServer, popular.data]);
}

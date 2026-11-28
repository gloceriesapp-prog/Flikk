// Pure: the live, in-stock products behind a card, in popularity order — the
// same rows the card's data check counted, so a tap never opens an empty or
// different list than the tag promised.
import type { LiveProduct, NearbyLive } from './availability.js';
import type { CardDef, UserSummary } from '../../../packages/today-grid/index.js';

export const CARD_PRODUCT_LIMIT = 60;

export function cardProductIds(def: CardDef, live: Pick<NearbyLive, 'products' | 'ranked' | 'popularWeek' | 'brandIds'>, user: UserSummary): string[] {
  const { products } = live;
  const pick = (keep: (p: LiveProduct) => boolean) => products.filter(keep).map(p => p.id);
  const ids = (() => {
    switch (def.check.kind) {
      case 'categories': case 'storeOpen': return pick(p => !!p.category && def.categories.includes(p.category));
      case 'usuals': return user.usualIds;
      case 'offers': return user.offerIds;
      case 'popular': { const inStock = new Set(products.map(p => p.id)); return live.popularWeek.filter(id => inStock.has(id)); }
      case 'bulk': return pick(p => Number(p.bulk_min_kg) > 0);
      case 'party': return pick(p => !!p.party_enabled);
      case 'brands': { const brands = new Set(live.brandIds); return pick(p => !!p.brand_id && brands.has(p.brand_id)); }
      case 'preorder': return pick(p => !!p.morning_slot);
    }
  })();
  const rank = new Map(live.ranked.map((id, index) => [id, index]));
  return [...new Set(ids)].sort((a, b) => (rank.get(a) ?? 1e9) - (rank.get(b) ?? 1e9)).slice(0, CARD_PRODUCT_LIMIT);
}

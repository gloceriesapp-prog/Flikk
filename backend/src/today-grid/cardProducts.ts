// Pure: the live, in-stock products a card tap opens — from its target, so
// the list matches what the card promised.
import type { LiveProduct, NearbyLive } from './availability.js';
import type { ItemConfig, UserSummary } from '../../../packages/today-grid/index.js';

export const CARD_PRODUCT_LIMIT = 60;

export function cardProductIds(item: ItemConfig, live: Pick<NearbyLive, 'products' | 'ranked' | 'popularWeek' | 'availability'>, user: UserSummary): string[] {
  const { products } = live;
  const pick = (keep: (p: LiveProduct) => boolean) => products.filter(keep).map(p => p.id);
  const t = item.target;
  const ids = (() => {
    switch (t.type) {
      case 'categories': { const names = t.categories.length ? t.categories : item.categories; return pick(p => !!p.category && names.includes(p.category)); }
      case 'subcategory': return pick(p => p.sub_category_id === t.id);
      case 'products': { const inStock = new Set(products.map(p => p.id)); return t.productIds.filter(id => inStock.has(id)); }
      case 'brands': { const local = new Set(live.availability.localBrands.brandIds); return pick(p => !!p.brand_id && local.has(p.brand_id)); }
      case 'tab': return [];
      case 'action':
        switch (t.id) {
          case 'add-usuals': return user.usualIds;
          case 'offers': return user.offerIds;
          case 'popular': { const inStock = new Set(products.map(p => p.id)); return live.popularWeek.filter(id => inStock.has(id)); }
          case 'bulk': return pick(p => Number(p.bulk_min_kg) > 0);
          case 'party-form': return pick(p => !!p.party_enabled);
          case 'preorder-list': return pick(p => !!p.morning_slot);
        }
    }
  })();
  const rank = new Map(live.ranked.map((id, index) => [id, index]));
  return [...new Set(ids)].sort((a, b) => (rank.get(a) ?? 1e9) - (rank.get(b) ?? 1e9)).slice(0, CARD_PRODUCT_LIMIT);
}

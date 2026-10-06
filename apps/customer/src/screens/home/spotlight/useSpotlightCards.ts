// Real product slices for SpotlightCarousel.tsx's 4 cards — same catalog
// feed MostShoppedSection/MostBoughtSection already trust
// (useEverydayEssentials -> GET /stores/products/catalog), store-promotional
// per an explicit ask (this carousel should also promote real stores, not
// just products):
//   1. Trending in {store}  — the nearest real store's own products
//      (useNearestStore, same store useDealsProducts already scopes to for
//      "Today's Steal Deals" — one resolved store, not a second lookup),
//      filtered from the catalog by storeId so it's genuinely that store's
//      inventory, not the whole zone relabeled with a store's name.
//   2. Trending near your area — the same catalog, zone-wide, no store
//      filter (was 'top-picks').
//   3. Best Deals — products with a real originalPrice > price, highest-
//      discount first (PopularProductRow already computes and shows the
//      real % off per row — nothing here fabricates a number).
//   4. Most bought near you — per an explicit ask for a 4th card. Honest
//      caveat: there's no real purchase-count field anywhere in this
//      pipeline yet (Product['ratingCount'] is always '' for real products
//      — api/products.ts's own mapApiProduct never fills it), so this is
//      NOT actually sorted by purchase volume — same gap MostBoughtSection.tsx
//      has always had. Rather than inventing a fake popularity number, this
//      shows the catalog in REVERSE order — still 100% real products, just
//      a genuinely different real slice than card #2's own first-N cut,
//      so the two cards don't show identical content back to back.
// A card whose slice comes up empty is dropped rather than shown blank —
// same "real deals only" rule PopularStorePanel.tsx already follows.
//
// ctaLabel — MostShoppedCard's own bottom pill button text, per an explicit
// ask that it NOT be "See all" on every card. Each card gets its own real
// wording matching what it's actually promoting.

import { useMemo } from 'react';
import type { Product } from '../products/types';
import { useEverydayEssentials } from '../everyday-essentials/useEverydayEssentials';
import { useNearestStore } from '../useNearestStore';

const MAX_ROWS_PER_CARD = 4;

export interface SpotlightCard {
  key: string;
  title: string;
  products: Product[];
  ctaLabel: string;
}

export interface SpotlightCardsResult {
  cards: SpotlightCard[];
  // Whichever card in this batch actually has the most real rows to show
  // (capped at MAX_ROWS_PER_CARD, same cap CatalogRowsList's own default
  // applies) — MostShoppedCard.tsx pads every card up to this many rows
  // so all their "See all" bars land on the same y, without assuming a
  // worst-case 4 that a genuinely shorter data set (e.g. only 2 real
  // discounted products in "Best Deals") would never actually reach.
  minRows: number;
}

function discountPercent(product: Product): number {
  if (!product.originalPrice || product.originalPrice <= product.price) return 0;
  return Math.round((1 - product.price / product.originalPrice) * 100);
}

export function useSpotlightCards(): SpotlightCardsResult {
  const { data: catalog = [] } = useEverydayEssentials();
  const { storeId: nearestStoreId, storeName: nearestStoreName } = useNearestStore();

  return useMemo(() => {
    const storeProducts = nearestStoreId ? catalog.filter((product) => product.storeId === nearestStoreId) : [];
    const deals = [...catalog].filter((product) => discountPercent(product) > 0).sort((a, b) => discountPercent(b) - discountPercent(a));
    const reversedCatalog = [...catalog].reverse();

    // Cards are always white now (MostShoppedCard's own default, per an
    // explicit ask) — no per-key bg tint here anymore. cardTintForSpotlightKey
    // (spotlightGradients.ts) still exists for SpotlightHeaderBleed's own
    // background bridge, unrelated to the card's own surface color.
    const cards: SpotlightCard[] = [];
    if (storeProducts.length > 0 && nearestStoreName) {
      cards.push({
        key: 'trending-store',
        title: `Picks from ${nearestStoreName}`,
        products: storeProducts,
        ctaLabel: 'Visit store',
      });
    }
    if (catalog.length > 0) {
      cards.push({ key: 'trending-area', title: 'Available near you', products: catalog, ctaLabel: 'See all' });
    }
    if (deals.length > 0) {
      cards.push({ key: 'best-deals', title: 'Deals Youll Love', products: deals, ctaLabel: 'Grab deals' });
    }
    if (reversedCatalog.length > 0) {
      cards.push({
        key: 'most-bought',
        title: 'More to explore',
        products: reversedCatalog,
        ctaLabel: 'Shop more',
      });
    }

    const minRows = cards.reduce((max, card) => Math.max(max, Math.min(card.products.length, MAX_ROWS_PER_CARD)), 0);
    return { cards, minRows };
  }, [catalog, nearestStoreId, nearestStoreName]);
}

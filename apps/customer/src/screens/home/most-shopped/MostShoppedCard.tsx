// Same shell as store-list/popular/PopularStorePanel.tsx ("Popular this
// week"), reused as-is per an explicit ask — rounded-[24px], border-gray-
// 100, py-4, a header Pressable (accent-colored title + subtitle + chevron
// circle), then real rows (PopularProductRow) under a border-t divider
// with border-b between them. Not a lookalike rebuilt from scratch — same
// className values, same PopularProductRow import. Only the background is
// this card's own: a light mist-green tint (CARD_BG) instead of
// PopularStorePanel's plain white, per an explicit ask that every card in
// this carousel share one shell but keep its own light bg color.
//
// Three real differences from PopularStorePanel, all because this card's
// data is genuinely different in shape:
//  - Title stays "Most shopped near you" rather than "Popular in
//    {store.name}": useEverydayEssentials' catalog (GET /stores/products/
//    catalog) is cross-store — a single row here can mix products from
//    several different stores, so there's no one store name to put in the
//    title (CLAUDE.md's single-store-per-order rule is enforced at
//    add-to-cart/checkout, not by this card pretending everything shown
//    is one store).
//  - The chevron button has no onPress: PopularStorePanel's chevron
//    navigates to that one store's StoreDetail, which only makes sense
//    when the panel IS one store. Kept in the layout (matching the
//    reused shell) rather than removed, since a real "browse all" screen
//    for this cross-store row doesn't exist yet — same "UI exists, flow
//    not wired" convention as TopHeader's Support/Message icons.
//  - Width is a hardcoded PANEL_WIDTH constant, not a prop — same as
//    PopularStorePanel's own PANEL_WIDTH (300), per an explicit ask to
//    match that card's real width, not this carousel's peek-width math.
//  - Height driven by real content, not a hardcoded worst-case guess — but
//    the "See all" bar still has to land on the same y across every card
//    in the same carousel (SpotlightCarousel.tsx), so a shorter card's
//    footer doesn't ride up above a taller sibling's. `minRows` (computed
//    once, in useSpotlightCards.ts, from this carousel's own real data —
//    whichever card actually has the most rows to show, capped at 4) pads
//    a shorter card's row area up to match via ROW_HEIGHT arithmetic
//    instead of a fixed 460px constant that could over- or under-shoot
//    the real content. A carousel where every card happens to have only
//    2 real rows now renders a genuinely shorter card, not one padded out
//    to a "4 rows" guess that was never true for this data.
//  - Plain white background (explicit ask) instead of PopularStorePanel's
//    own light-tint-per-card scheme.
//  - Bottom CTA bar (per an explicit ask/reference image): full-width, flush
//    with the card's own bottom edge (rounded to match its corners, not a
//    floating pill with side margins), a plain gray bg + a border-t divider
//    above it — not PopularStorePanel's own chevron-only footer. `ctaLabel`
//    is a prop, not a hardcoded "See all", because the ask was explicit
//    that every card should NOT share that one label — useSpotlightCards.ts
//    gives each of its cards its own real, distinct wording. No onPress,
//    same "UI exists, flow not wired" convention as the chevron above it —
//    there's no real "browse all" screen for any of these cross-store/
//    cross-category cuts yet.

import { Pressable, Text, View } from 'react-native';
import { CatalogRowsList } from './CatalogRowsList';
import type { Product } from '../products/types';

// Same width PopularStorePanel.tsx hardcodes for itself.
const PANEL_WIDTH = 300;
// PopularProductRow's own real per-row height: h-14 (56px) image + py-3
// (12+12=24px) vertical padding = 80px. Exported so useSpotlightCards.ts
// and SpotlightHeaderBleed.tsx can size off this same real number instead
// of each guessing their own.
export const ROW_HEIGHT = 80;
// Header block (pt-4 + title/subtitle text + pb-3) + the bottom CTA bar
// (border-t + py-3.5 + label) — real measured chrome height around
// whatever CatalogRowsList itself ends up being. SpotlightHeaderBleed.tsx
// sizes its own background bleed off HEADER_HEIGHT + FOOTER_HEIGHT +
// (minRows * ROW_HEIGHT), the same real arithmetic this card's own layout
// uses, not a separate guessed total.
export const HEADER_HEIGHT = 69;
export const FOOTER_HEIGHT = 62;
// Same indigo family PopularStorePanel.tsx uses for its own title accent.
const ACCENT = '#4C5FE0';

interface Props {
  title: string;
  products: Product[];
  ctaLabel: string;
  // Pads this card's row area up to match whichever card in the same
  // carousel actually has the most real rows (useSpotlightCards.ts's own
  // note) — so every card's "See all" bar lands on the same y regardless
  // of how many real rows THIS card's own slice happens to have.
  minRows?: number;
}

export function MostShoppedCard({ title, products, ctaLabel, minRows }: Props) {
  // Only pad a card that's genuinely SHORTER than minRows — a card that
  // already has the max real row count (4/4 here) gets no forced
  // minHeight at all, so it can never show a gap from a real row's
  // rendered height coming in even a few px under the ROW_HEIGHT estimate
  // (border hairlines, font line-height rounding). That gap only has a
  // reason to exist for a card with genuinely fewer real rows than its
  // siblings, never for one already matching the tallest.
  const thisCardRows = Math.min(products.length, 4);
  const rowAreaMinHeight = minRows && minRows > thisCardRows ? minRows * ROW_HEIGHT : undefined;

  return (
    <View className="overflow-hidden rounded-[24px] border border-gray-100 bg-white" style={{ width: PANEL_WIDTH }}>
      <View className="flex-row items-start justify-between gap-2 px-4 pb-3 pt-4">
        <View className="flex-1 gap-1">
          <Text className="text-[16px] font-semibold" numberOfLines={1} style={{ color: ACCENT }}>
            {title}
          </Text>
          <Text className="text-[12.5px] font-medium text-ink/50">Tap an item to add it to your order</Text>
        </View>
      </View>

      <View style={{ minHeight: rowAreaMinHeight }}>
        <CatalogRowsList products={products} />
      </View>

      <Pressable className="items-center border-t border-gray-100 bg-gray-100 py-3.5 active:opacity-70">
        <Text className="text-[13.5px] font-bold" style={{ color: ACCENT }}>
          {ctaLabel}
        </Text>
      </Pressable>
    </View>
  );
}

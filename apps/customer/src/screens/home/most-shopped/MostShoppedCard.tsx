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
//  - Fixed CARD_HEIGHT, not content-driven: per an explicit ask ("however
//    much content, the See all button should be fixed in the bottom"), the
//    bottom CTA bar has to land at the exact same y position on every card
//    regardless of how many real rows a given card's slice has (trending-
//    store/best-deals can come up shorter than a full 4). The header block
//    and footer bar are both fixed-height; CatalogRowsList sits in a
//    flex-1 middle section that absorbs whatever's left — a short card
//    just leaves blank space in that middle section instead of the footer
//    riding up to meet fewer rows.
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
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import { CatalogRowsList } from './CatalogRowsList';
import type { Product } from '../products/types';

// Same width PopularStorePanel.tsx hardcodes for itself.
const PANEL_WIDTH = 300;
// Header block (~69: pt-4 + title/subtitle text + pb-3) + a full 4-row
// CatalogRowsList (~320: PopularProductRow's own h-14 image + py-3, times
// 4) + the bottom CTA bar (~62: mt-4 + border-t + py-3.5 + label) — a real
// FIXED height now (not a floor), so SpotlightHeaderBleed.tsx's own
// PANEL_HEIGHT can size off this exact number instead of a rough estimate.
export const CARD_HEIGHT = 460;
// Same indigo family PopularStorePanel.tsx uses for its own title accent.
const ACCENT = '#4C5FE0';

interface Props {
  title: string;
  products: Product[];
  ctaLabel: string;
}

export function MostShoppedCard({ title, products, ctaLabel }: Props) {
  return (
    <View
      className="overflow-hidden rounded-[24px] border border-gray-100 bg-white"
      style={{ width: PANEL_WIDTH, height: CARD_HEIGHT }}
    >
      <View className="flex-row items-start justify-between gap-2 px-4 pb-3 pt-4">
        <View className="flex-1 gap-1">
          <Text className="text-[15px] font-semibold" numberOfLines={1} style={{ color: ACCENT }}>
            {title}
          </Text>
          <Text className="text-[12.5px] font-medium text-ink/50">Tap an item to add it to your order</Text>
        </View>
        <Pressable className="mt-0.5 h-7 w-7 items-center justify-center rounded-full bg-gray-100 active:opacity-70">
          <AppIcon icon={ArrowRight01Icon} size={14} color={colors.ink} strokeWidth={2} />
        </Pressable>
      </View>

      <View className="flex-1">
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

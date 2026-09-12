// Home's "All" tab — sits right below NearbyStoresSection (see
// screens/home/sections/AllTabSections.tsx for the order). Unlike that
// section, this one *does* scroll horizontally — 5 products don't fit in
// one static row at a legible card size, and horizontal scroll is the
// established pattern for product rows on Home already (see
// screens/home/category-tab/components/ProductTeaserRow.tsx).
//
// Reuses ProductCard as-is (the same card screens/home/products/ProductSection.tsx
// uses for Today's Deal/Bestsellers) — the reference for this row is that
// exact card, just laid out horizontally instead of a wrapping grid.
//
// Real catalog products (useEverydayEssentials.ts -> GET
// /stores/products/catalog), not the old EVERYDAY_ESSENTIALS_PRODUCTS mock
// — same products a founder adds via admin's Inventory screen. Renders
// nothing when the catalog is empty, same convention AllTabSections.tsx
// uses for the deals row.

import { ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ProductCard } from '../products/ProductCard';
import { useEverydayEssentials } from './useEverydayEssentials';

// How much of the right edge the fade overlay covers — wide enough to
// soften a card's own cut edge, narrow enough that it never eats into a
// fully-visible card's own content.
const EDGE_FADE_WIDTH = 36;

// Card width (w-32 = 128px) + the row's own gap-4 (16px) — the real pixel
// distance between one card's left edge and the next's. Passed to
// snapToInterval below so the row always comes to rest on a full card,
// same "no card ever sits half-cut once scrolling stops" behavior
// SeasonalSection.tsx already gets from measuring its own row width; this
// row's cards are a fixed size (same size everywhere, per an earlier
// ask), so it earns that same full-card-at-rest guarantee via scroll
// snapping instead of resizing tiles to fit an exact count.
const CARD_SNAP_INTERVAL = 128 + 16;

export function EverydayEssentialsSection() {
  const { data: products = [] } = useEverydayEssentials();

  if (products.length === 0) return null;

  return (
    <View className="pt-6">
      <Text className="mb-4 px-5 text-lg font-bold text-ink">Today&apos;s Stock</Text>

      {/* snapToInterval + decelerationRate="fast" is what actually fixes
          "there should be full content, need to scroll" — without it, a
          scroll gesture can end anywhere, leaving a card sitting half-cut
          at rest, not just mid-drag. With it, every resting position
          (including the untouched initial one) always shows full cards,
          same guarantee SeasonalSection.tsx gets from measuring its own
          row width to fit an exact tile count — this row's cards are a
          fixed size instead (same size everywhere, per an earlier ask),
          so snapping to that fixed size is what earns the same guarantee
          here. The fade overlay below still softens the brief mid-drag
          moment a card is genuinely half-visible, which snapping alone
          doesn't hide. */}
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-4 px-5"
          snapToInterval={CARD_SNAP_INTERVAL}
          snapToAlignment="start"
          decelerationRate="fast"
        >
          {products.map((product) => (
            <ProductCard key={product.id} product={product} widthClassName="w-32" showDiscountBadge />
          ))}
        </ScrollView>

        <LinearGradient
          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,1)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          pointerEvents="none"
          style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: EDGE_FADE_WIDTH }}
        />
      </View>
    </View>
  );
}

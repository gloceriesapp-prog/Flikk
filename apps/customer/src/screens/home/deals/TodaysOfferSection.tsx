// "Todays offer" — plain horizontal row of 4 real deal products (reference
// sketch: title + 4 rounded squares, no sliding/auto-advance — unlike
// SpotlightCarousel below it, this is a static scroll, not a carousel).
// Reuses the same real discounted-products feed AllTabSections.tsx already
// fetches for "Today's Steal Deals" (useDealsProducts, nearest-store-scoped)
// and the same ProductCard used everywhere else on Home — no new card UI,
// no new data source. White background (explicit ask), plain — no
// container border/divider next to the cards.
//
// Exactly 4 cards, first-4 slice of the real deals list — not a "show
// whatever's there" grid, per an explicit ask to fix the count.

import { ScrollView, Text, View } from 'react-native';
import { ProductCard } from '../products/ProductCard';
import type { Product } from '../products/types';

const CARD_WIDTH = 'w-32';
const MAX_OFFERS = 4;
// Fixed height, not content-driven — card (image+name+price) plus title
// row above it; keeps this section's footprint stable regardless of how
// long a given deal's name happens to render.
const SECTION_HEIGHT = 236;

interface Props {
  products: Product[];
}

export function TodaysOfferSection({ products }: Props) {
  const offers = products.slice(0, MAX_OFFERS);
  if (offers.length === 0) return null;

  return (
    <View className="bg-white pt-5" style={{ height: SECTION_HEIGHT }}>
      <Text className="mb-3 px-5 text-lg font-semibold text-ink">Todays offer</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}>
        {offers.map((product) => (
          <ProductCard key={product.id} product={product} showDiscountBadge widthClassName={CARD_WIDTH} />
        ))}
      </ScrollView>
    </View>
  );
}

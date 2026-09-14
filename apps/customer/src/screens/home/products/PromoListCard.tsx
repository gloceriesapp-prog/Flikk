// Generic Home row — title + a horizontally-scrolling row of real product
// cards. Shared by every section that's fundamentally "a title and a
// product row" with no card shell/background/"See all" footer of its own
// (MostBoughtSection.tsx, BuyItAgainSection.tsx) — one component, not a
// copy per section, so a layout fix here (snap behavior, card width) never
// needs to be repeated across sections that happen to look identical.
// Lives in home/products/ (not any one section's own folder) precisely
// because it isn't owned by a single section anymore.
//
// Full-width scroll, same fix as EverydayEssentialsSection.tsx's own
// note: the horizontal inset (px-5) lives on the TITLE and on the
// ScrollView's own contentContainer, never on an outer wrapper around the
// ScrollView itself — padding an outer wrapper shrinks the ScrollView's
// real viewport, capping how far it can ever scroll/how much width a
// card can use, which was the actual "not full width" bug. snapToInterval
// + decelerationRate="fast" is what guarantees the row always comes to
// rest on a full card. No right-edge fade overlay — per an explicit ask,
// dropped (it read as an unwanted white wash rather than a subtle cue).

import { ScrollView, Text, View } from 'react-native';
import { ProductCard } from './ProductCard';
import type { Product } from './types';

const VISIBLE_PRODUCTS = 6;
const PRODUCT_CARD_WIDTH = 'w-32';
const CARD_SNAP_INTERVAL = 128 + 12; // w-32 (128px) + this row's own gap-3 (12px)

interface Props {
  title: string;
  products: Product[];
}

export function PromoListCard({ title, products }: Props) {
  const visibleProducts = products.slice(0, VISIBLE_PRODUCTS);

  return (
    <View>
      <Text className="px-5 text-[18.5px] font-semibold leading-6 tracking-tight text-black/80">{title}</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="items-start gap-3 px-5 pt-3"
        snapToInterval={CARD_SNAP_INTERVAL}
        snapToAlignment="start"
        decelerationRate="fast"
      >
        {visibleProducts.map((product) => (
          <ProductCard key={product.id} product={product} widthClassName={PRODUCT_CARD_WIDTH} showDiscountBadge />
        ))}
      </ScrollView>
    </View>
  );
}

// Plain section — title + a horizontally-scrolling row of real product
// cards. Per an explicit ask, the earlier colored-frame/white-panel card
// shell, shadow, and "See all" footer are all gone; just the title and
// the shared ProductCard row remain. Same real product feed the parent
// section passes in (MostBoughtSection.tsx).
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
import { ProductCard } from '../../products/ProductCard';
import type { Product } from '../../products/types';

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
      <Text className="px-5 text-[17px] font-bold leading-6 tracking-tight text-ink">{title}</Text>

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

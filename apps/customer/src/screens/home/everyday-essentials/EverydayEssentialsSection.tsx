// Home's "All" tab — "Today's Stock". Fixed 3-column grid now, capped at 9
// products, no horizontal scroll — per an explicit ask, replacing the
// earlier horizontally-scrolling row (snapToInterval + edge fade). Same
// 3-column percentage-width pattern PurchaseRecommendations.tsx/
// WishlistScreen.tsx already use for a 3-per-row grid (w-[31%], not a
// fixed pixel width — that's what guarantees exactly 3 fit per row on any
// screen size, unlike ProductSection.tsx's own fixed-w-32 wrap grid, which
// can land on 2 or 3 depending on device width).
//
// Reuses ProductCard as-is (the same card every other product grid on
// this screen uses).
//
// Real catalog products (useEverydayEssentials.ts -> GET
// /stores/products/catalog), not the old EVERYDAY_ESSENTIALS_PRODUCTS mock
// — same products a founder adds via admin's Inventory screen. Renders
// nothing when the catalog is empty, same convention AllTabSections.tsx
// uses for the deals row.

import { View } from 'react-native';
import { ProductCard } from '../products/ProductCard';
import { SectionTitle } from '../components/SectionTitle';
import { useEverydayEssentials } from './useEverydayEssentials';

const GRID_LIMIT = 9;
const CARD_WIDTH = 'w-[31%]';

interface Props {
  title?: string;
  subtitle?: string | null;
}

export function EverydayEssentialsSection({ title = 'Everyday Essentials', subtitle }: Props) {
  const { data: products = [] } = useEverydayEssentials();
  const gridProducts = products.slice(0, GRID_LIMIT);

  if (gridProducts.length === 0) return null;

  return (
    <View className="pt-8">
      <SectionTitle subtitle={subtitle}>{title}</SectionTitle>

      <View className="flex-row flex-wrap gap-x-2.5 gap-y-5 px-5">
        {gridProducts.map((product) => (
          <ProductCard key={product.id} product={product} widthClassName={CARD_WIDTH} showDiscountBadge />
        ))}
      </View>
    </View>
  );
}

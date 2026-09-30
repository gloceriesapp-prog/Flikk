// "Trending This Week" — Home's "All" tab, right after MostBoughtSection
// (momentum signal, per the agreed Home section order). Reuses the same
// title+horizontal-scroll shell every other plain product row already
// uses (PromoListCard, home/products/) — capped at 6 (useTrendingThisWeek
// already returns at most 6, PromoListCard's own VISIBLE_PRODUCTS would
// cap it further at 6 anyway).
//
// Renders nothing while there's no real product data — same convention
// every other Home row follows (never a placeholder/skeleton).

import { View } from 'react-native';
import { PromoListCard } from '../products/PromoListCard';
import { useTrendingThisWeek } from './useTrendingThisWeek';

interface Props {
  title?: string;
  subtitle?: string | null;
}

export function TrendingSection({ title = 'Popular This Week', subtitle }: Props) {
  const { data: products = [] } = useTrendingThisWeek();

  if (products.length === 0) return null;

  return (
    <View className="pt-8">
      <PromoListCard title={title} subtitle={subtitle} products={products} />
    </View>
  );
}

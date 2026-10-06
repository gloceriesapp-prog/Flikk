// Plain "Most Bought Near You" row leading Home's "All" tab — per an
// explicit ask, no card shell/background/"See all" button, just the
// title and the product row (PromoListCard.tsx's own note). Real catalog
// data (useEverydayEssentials.ts -> GET /stores/products/catalog).
//
// No horizontal padding on this wrapper — PromoListCard's own title and
// ScrollView each carry their own px-5 instead, so the ScrollView's real
// viewport spans the full screen width (a padded wrapper around it was
// the actual "not full width" bug, see that file's own note).
//
// Sits above NearbyStoresSection ("Shops Near You") on Home's "All" tab,
// per an explicit ask.

import { View } from 'react-native';
import { useTrendingThisWeek } from '../trending/useTrendingThisWeek';
import { PromoListCard } from '../products/PromoListCard';

interface Props {
  title?: string;
  subtitle?: string | null;
}

export function MostBoughtSection({ title = 'Most Bought Near You', subtitle }: Props) {
  const { data: catalog = [] } = useTrendingThisWeek();

  if (catalog.length === 0) return null;

  return (
    <View className="pt-8">
      <PromoListCard title={title} subtitle={subtitle} products={catalog} />
    </View>
  );
}

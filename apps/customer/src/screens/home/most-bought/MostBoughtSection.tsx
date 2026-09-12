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
import { useEverydayEssentials } from '../everyday-essentials/useEverydayEssentials';
import { PromoListCard } from './components/PromoListCard';

export function MostBoughtSection() {
  const { data: catalog = [] } = useEverydayEssentials();

  if (catalog.length === 0) return null;

  return (
    <View className="pt-6">
      <PromoListCard title="Most Bought Near You" products={catalog} />
    </View>
  );
}

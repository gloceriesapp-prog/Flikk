// "Popular this week" — horizontal row of PopularStorePanel, one per
// nearby store (useNearestStores.ts, the same real GET /stores/nearest
// NearestToYouSection.tsx uses directly above this section — react-query
// caches by the same key, so this isn't a second network round trip).
// Stores with no real deals right now render nothing (PopularStorePanel's
// own guard), so the row can genuinely be shorter than the nearest-stores
// list it's built from.

import { ScrollView, Text, View } from 'react-native';
import { useAllStores } from '../all-stores/useAllStores';
import { PopularStorePanel } from './PopularStorePanel';

export function PopularThisWeekSection() {
  // Uses useAllStores (real zone stores, GET /stores) not useNearestStores —
  // that one is disabled with no delivery location set, which hid this whole
  // section. All-stores is location-independent so the row always shows real
  // stores; each panel below fills with that store's real DB products.
  const { data: stores = [] } = useAllStores();

  if (stores.length === 0) return null;

  return (
    <View className="pt-6">
      <Text className="mb-4 px-5 text-[18px] font-bold text-ink/90 tracking-[-0.35px]">Popular this week</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3.5 px-5">
        {stores.map((store) => (
          <PopularStorePanel key={store.id} storeId={store.id} storeName={store.name} />
        ))}
      </ScrollView>
    </View>
  );
}

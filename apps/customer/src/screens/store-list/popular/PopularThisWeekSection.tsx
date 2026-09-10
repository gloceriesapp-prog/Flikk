// "Popular this week" — horizontal row of PopularStorePanel, one per
// nearby store (useNearestStores.ts, the same real GET /stores/nearest
// NearestToYouSection.tsx uses directly above this section — react-query
// caches by the same key, so this isn't a second network round trip).
// Stores with no real deals right now render nothing (PopularStorePanel's
// own guard), so the row can genuinely be shorter than the nearest-stores
// list it's built from.

import { ScrollView, Text, View } from 'react-native';
import { useNearestStores } from '../nearest/useNearestStores';
import { PopularStorePanel } from './PopularStorePanel';

export function PopularThisWeekSection() {
  const { data: stores = [] } = useNearestStores();

  if (stores.length === 0) return null;

  return (
    <View className="pt-6">
      <Text className="mb-4 px-5 text-[18px] font-semibold text-ink">Popular this week</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3.5 px-5">
        {stores.map((store) => (
          <PopularStorePanel key={store.id} storeId={store.id} storeName={store.name} />
        ))}
      </ScrollView>
    </View>
  );
}

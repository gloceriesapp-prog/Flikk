// Horizontal highlight row — the 4-5 stores worth surfacing before the full
// vertical list below (see ../all-stores/AllStoresSection.tsx). Reads from
// the same STORE_LISTINGS as the full list rather than its own dataset, so
// the two sections can't drift out of sync with each other.

import { ScrollView, Text, View } from 'react-native';
import { TopStoreAvatar } from './components/TopStoreAvatar';
import { STORE_LISTINGS } from '../data';

const HIGHLIGHT_COUNT = 5;

export function TopStoresSection() {
  const highlightedStores = STORE_LISTINGS.slice(0, HIGHLIGHT_COUNT);

  return (
    <View className="pt-6">
      <Text className="px-5 pb-4 text-lg font-bold text-ink">Popular near you</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3 px-5">
        {highlightedStores.map((store) => (
          <TopStoreAvatar key={store.id} store={store} />
        ))}
      </ScrollView>
    </View>
  );
}

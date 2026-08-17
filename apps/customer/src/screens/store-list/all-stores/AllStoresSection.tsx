// The full vertical store list — pulled out of StoreListScreen into its own
// file so it sits alongside ../top-stores/TopStoresSection.tsx as a sibling
// section, each with its own heading, rather than one screen file owning
// both layouts inline.

import { Text, View } from 'react-native';
import { StoreCard } from '../components/StoreCard';
import { STORE_LISTINGS } from '../data';

export function AllStoresSection() {
  return (
    <View className="pt-6">
      <Text className="px-5 pb-4 text-lg font-bold text-ink">All stores near you</Text>

      <View className="gap-5 px-5">
        {STORE_LISTINGS.map((store) => (
          <StoreCard key={store.id} store={store} />
        ))}
      </View>
    </View>
  );
}

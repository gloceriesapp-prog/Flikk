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
      <View className="flex-row items-center justify-between px-5 pb-4">
        <Text className="text-lg font-semibold text-ink">
          All stores near you
        </Text>

        <View className="flex-row items-center gap-1.5 rounded-full bg-green-50 px-3 py-1.5">
          <View className="h-2 w-2 rounded-full bg-green-500" />
          <Text className="text-sm font-medium text-green-700">
            Open now
          </Text>
        </View>
      </View>

      <View className="gap-5 px-5">
        {STORE_LISTINGS.map((store) => (
          <StoreCard key={store.id} store={store} />
        ))}
      </View>
    </View>
  );
}

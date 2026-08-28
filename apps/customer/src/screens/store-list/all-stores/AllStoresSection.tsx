// The full vertical store list — pulled out of StoreListScreen into its own
// file so it sits alongside ../top-stores/TopStoresSection.tsx as a sibling
// section, each with its own heading, rather than one screen file owning
// both layouts inline. Real stores (useAllStores.ts -> GET /stores), not
// the old STORE_LISTINGS mock — renders nothing while there are none, same
// convention as every Home section that reads real data.

import { Text, View } from 'react-native';
import { StoreCard } from '../components/StoreCard';
import { useAllStores } from './useAllStores';

export function AllStoresSection() {
  const { data: stores = [] } = useAllStores();

  if (stores.length === 0) return null;

  return (
    <View className="pt-6">
      <View className="flex-row items-center justify-between px-5 pb-4">
        <Text className="text-lg font-semibold text-ink">
          All stores near you
        </Text>
      </View>

      <View className="gap-5 px-5">
        {stores.map((store) => (
          <StoreCard key={store.id} store={store} />
        ))}
      </View>
    </View>
  );
}

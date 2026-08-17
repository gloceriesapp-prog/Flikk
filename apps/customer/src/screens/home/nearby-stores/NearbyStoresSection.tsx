// Home's "All" tab, first section — introduces the stores behind the
// products without a sales-y "come shop with us" pitch, just a plain
// factual heading. Renders before DealsSection; see
// screens/home/sections/AllTabSections.tsx for where this slots in.
//
// Deliberately a static row, not a horizontal ScrollView — three store
// tiles plus a trailing "View all" tile, sized to fit the screen width at
// once (flex-1 per tile) rather than scrolling. Reads from the same
// STORE_LISTINGS as screens/store-list, so this row and the full Store tab
// can't drift out of sync with each other.

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Text, View } from 'react-native';
import { STORE_LISTINGS } from '../../store-list/data';
import { NearbyStoreCard } from './components/NearbyStoreCard';
import { ViewAllStoresTile } from './components/ViewAllStoresTile';
import type { AppStackParamList } from '../../../navigation/types';

const ROW_STORE_COUNT = 3;

export function NearbyStoresSection() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const rowStores = STORE_LISTINGS.slice(0, ROW_STORE_COUNT);

  function goToStore(storeId: string, storeName: string) {
    navigation.navigate('StoreDetail', { storeId, storeName });
  }

  return (
    <View className="px-5 pt-6">
      {/* <Text className="mb-4 text-lg font-extrabold text-ink">Shops near you</Text> */}

      <View className="flex-row gap-3">
        {rowStores.map((store) => (
          <NearbyStoreCard key={store.id} store={store} onPress={() => goToStore(store.id, store.name)} />
        ))}
        <ViewAllStoresTile onPress={() => navigation.navigate('Store')} />
      </View>
    </View>
  );
}

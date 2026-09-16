// Home's "All" tab, first section — introduces the stores behind the
// products without a sales-y "come shop with us" pitch. Renders before
// DealsSection; see screens/home/sections/AllTabSections.tsx for where this
// slots in.
//
// Plain page-bg row, not a card — no white bg/rounded/shadow box and no
// bottom color-fill strip, both removed per an explicit ask ("remove the bg
// colour and all, and box effect"). Just the heading (same mb-4 px-5
// pattern EverydayEssentialsSection.tsx uses for "Today's Stock") followed
// by a bigger horizontal-scroll row of store tiles — StoreTileCard
// (home/components/, shared with TopRatedStoresSection/NewOnFlikkSection)/
// ViewAllStoresTile both bumped up in size (own files, see their notes) to
// compensate for the card wrapper no longer giving this row any visual
// weight of its own.
//
// Real stores (useNearbyStores.ts -> GET /stores), not the old
// STORE_LISTINGS mock — same stores a founder adds via admin's Add Store
// form. Renders nothing while there are none, same convention as the
// deals/essentials sections on this same screen.

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView, Text, View } from 'react-native';
import { useNearbyStores } from './useNearbyStores';
import { StoreTileCard } from '../components/StoreTileCard';
import { ViewAllStoresTile } from './components/ViewAllStoresTile';
import type { AppStackParamList } from '../../../navigation/types';

const ROW_STORE_COUNT = 4;

export function NearbyStoresSection() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { data: stores = [] } = useNearbyStores();
  const rowStores = stores.slice(0, ROW_STORE_COUNT);

  function goToStore(storeId: string, storeName: string) {
    navigation.navigate('StoreDetail', { storeId, storeName });
  }

  if (rowStores.length === 0) return null;

  return (
    <View className="pt-6">
      <Text className="mb-4 px-5 text-[17px] font-bold text-black/80">Shop Any Store Nearby</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3 px-5">
        {rowStores.map((store) => (
          <StoreTileCard
            key={store.id}
            store={{ ...store, metaLabel: store.distanceLabel ? `${store.distanceLabel} away` : undefined }}
            onPress={() => goToStore(store.id, store.name)}
          />
        ))}
        <ViewAllStoresTile onPress={() => navigation.navigate('Store')} />
      </ScrollView>
    </View>
  );
}

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView, Text, View } from 'react-native';

import { useNearbyStores } from './useNearbyStores';
import { StoreTileCard } from '../components/StoreTileCard';
import { ViewAllStoresTile } from './components/ViewAllStoresTile';

import type { AppStackParamList } from '../../../navigation/types';

const ROW_STORE_COUNT = 4;

export function NearbyStoresSection() {
  const navigation =
    useNavigation<
      NativeStackNavigationProp<AppStackParamList>
    >();

  const { data: stores = [] } = useNearbyStores();

  const rowStores = stores.slice(
    0,
    ROW_STORE_COUNT,
  );

  function goToStore(
    storeId: string,
    storeName: string,
  ) {
    navigation.navigate('StoreDetail', {
      storeId,
      storeName,
    });
  }

  if (rowStores.length === 0) {
    return null;
  }

  return (
    <View className="pt-8">
      {/* SECTION HEADER */}
      <View
        className="
          mb-4
          flex-row
          items-end
          justify-between
          px-5
        "
      >
        <View className="flex-1">
          <Text
            className="
              text-[19px]
              font-bold
              tracking-[-0.4px]
              text-ink/90
            "
          >
            Stores near you
          </Text>
        </View>

        <View
          className="
            rounded-full
            bg-[#155DFC]/[0.08]
            px-3
            py-1.5
          "
        >
          <Text
            className="
              text-[11px]
              font-semibold
              text-[#155DFC]
            "
          >
            Nearby
          </Text>
        </View>
      </View>

      {/* STORE RAIL */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="
          gap-3
          px-5
          pb-1
        "
      >
        {rowStores.map((store) => (
          <StoreTileCard
            key={store.id}
            store={{
              ...store,
              metaLabel:
                store.distanceLabel
                  ? `${store.distanceLabel} away`
                  : undefined,
            }}
            onPress={() =>
              goToStore(
                store.id,
                store.name,
              )
            }
          />
        ))}

        <ViewAllStoresTile
          onPress={() =>
            navigation.navigate('Store')
          }
        />
      </ScrollView>
    </View>
  );
}
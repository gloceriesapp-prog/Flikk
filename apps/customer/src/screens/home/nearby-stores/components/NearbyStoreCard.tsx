// One store tile in the static row — image card (rounded-md per the
// reference, not the fully-rounded circular avatar used elsewhere) with the
// store name underneath. Presentational only; NearbyStoresSection owns
// navigation.

import { Image, Pressable, Text, View } from 'react-native';
import { getStoreImageUri } from '../../../../theme/placeholderImage';
import type { StoreListing } from '../../../store-list/data';

interface Props {
  store: StoreListing;
  onPress: () => void;
}

export function NearbyStoreCard({ store, onPress }: Props) {
  return (
    <Pressable onPress={onPress} className="flex-1 gap-2">
      <View className="aspect-square overflow-hidden rounded-2xl border border-gray-100 bg-white">
        <Image source={{ uri: getStoreImageUri(store.id) }} className="h-full w-full" resizeMode="cover" />
      </View>
      <Text className="text-center text-xs font-semibold text-ink" numberOfLines={1}>
        {store.name}
      </Text>
    </Pressable>
  );
}

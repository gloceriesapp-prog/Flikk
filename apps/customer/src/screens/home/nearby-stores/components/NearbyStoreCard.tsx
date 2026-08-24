// One store tile in the horizontal row — fixed-width landscape rounded card
// with the store name underneath. Bigger than before (w-36/h-28 image,
// text-sm name) now that NearbyStoresSection dropped its white-card wrapper
// — this tile needs to carry its own visual weight on the bare page bg.
// Presentational only; NearbyStoresSection owns navigation.

import { Image, Pressable, Text, View } from 'react-native';
import { getStoreImageUri } from '../../../../theme/placeholderImage';
import type { StoreListing } from '../../../store-list/data';

interface Props {
  store: StoreListing;
  onPress: () => void;
}

export function NearbyStoreCard({ store, onPress }: Props) {
  return (
    <Pressable onPress={onPress} className="w-36 gap-2">
      <View className="h-28 w-36 overflow-hidden rounded-2xl border border-gray-100 bg-white">
        <Image source={{ uri: getStoreImageUri(store.id) }} className="h-full w-full" resizeMode="cover" />
      </View>
      <Text className="text-center text-base font-medium text-ink" numberOfLines={1}>
        {store.name}
      </Text>
    </Pressable>
  );
}

import { Image, Pressable, Text, View } from 'react-native';
import { PLACEHOLDER_IMAGE_URI } from '../../../theme/placeholderImage';
import type { Store } from '../data';

interface Props {
  store: Store;
}

export function StoreLogoItem({ store }: Props) {
  return (
    <Pressable className="w-20 items-center gap-2">
      <View className="h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-gray-100 bg-white shadow-sm shadow-black/10">
        <Image source={{ uri: PLACEHOLDER_IMAGE_URI }} className="h-full w-full" resizeMode="cover" />
      </View>
      <Text className="text-center text-xs font-semibold leading-4 text-ink" numberOfLines={2}>
        {store.name}
      </Text>
    </Pressable>
  );
}

import { Image, Pressable, Text, View } from 'react-native';
import { getStoreImageUri } from '../../../../theme/placeholderImage';
import type { StoreListing } from '../../data';

interface Props {
  store: StoreListing;
}

export function TopStoreAvatar({ store }: Props) {
  return (
    <Pressable className="w-20 items-center gap-2">
      <View className="h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm shadow-black/10">
        <Image source={{ uri: getStoreImageUri(store.id) }} className="h-full w-full" resizeMode="cover" />
      </View>
      <Text className="text-center text-xs font-semibold leading-4 text-ink" numberOfLines={2}>
        {store.name}
      </Text>
    </Pressable>
  );
}

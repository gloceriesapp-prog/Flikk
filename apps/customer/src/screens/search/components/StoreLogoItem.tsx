import { Image, Pressable, Text, View } from 'react-native';
import type { Store } from '../data';

interface Props {
  store: Store;
}

export function StoreLogoItem({ store }: Props) {
  return (
    <Pressable className="w-20 items-center gap-2">
      <View className="h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-mist bg-white shadow-sm shadow-black/10">
        <Image
          source={{ uri: `https://picsum.photos/seed/${store.imageSeed}/160/160` }}
          className="h-full w-full"
          resizeMode="cover"
        />
      </View>
      <Text className="text-center text-xs font-semibold leading-4 text-ink" numberOfLines={2}>
        {store.name}
      </Text>
    </Pressable>
  );
}

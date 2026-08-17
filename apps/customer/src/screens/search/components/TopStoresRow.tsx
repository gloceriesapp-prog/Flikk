import { Pressable, ScrollView, Text, View } from 'react-native';
import { StoreLogoItem } from './StoreLogoItem';
import { TOP_STORES } from '../data';

export function TopStoresRow() {
  return (
    <View className="pt-6">
      <View className="flex-row items-center justify-between px-5 pb-4">
        <Text className="text-lg font-extrabold text-ink">Top Grocery Stores</Text>
        <Pressable hitSlop={8}>
          <Text className="text-sm font-bold text-coral">View all</Text>
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-4 px-5">
        {TOP_STORES.map((store) => (
          <StoreLogoItem key={store.id} store={store} />
        ))}
      </ScrollView>
    </View>
  );
}

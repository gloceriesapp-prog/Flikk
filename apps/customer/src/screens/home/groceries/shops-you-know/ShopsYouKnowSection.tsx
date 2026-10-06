import { BrowseLoadingText, BROWSE_LOADING_COPY } from '../../loading/BrowseLoadingText';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../../../navigation/types';
import { useLocationStore } from '../../../../store/useLocationStore';
import { SectionTitle } from '../../components/SectionTitle';
import { GroceryStorePreviewCard } from './GroceryStorePreviewCard';
import { useNearbyGroceryStores } from './useNearbyGroceryStores';

export function ShopsYouKnowSection() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const location = useLocationStore((state) => state.location);
  const { stores, isLoading, isError, retry } = useNearbyGroceryStores();

  return (
    <View className="pt-8">
      <SectionTitle>From shops you know</SectionTitle>
      {stores.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="items-start gap-3 px-5 pb-2" snapToInterval={320} snapToAlignment="start" decelerationRate="fast">
          {stores.map((store) => (
            <GroceryStorePreviewCard key={store.id} store={store} onOpen={() => navigation.navigate('StoreDetail', { storeId: store.id, storeName: store.name })} />
          ))}
        </ScrollView>
      ) : (
        <View className="mx-5 items-center gap-3 rounded-3xl bg-[#F5F7F1] px-5 py-6">
          {!location ? (
            <>
              <Text className="text-center text-sm text-ink/60">Find grocery shops around your delivery address.</Text>
              <Pressable accessibilityRole="button" onPress={() => navigation.navigate('SelectLocation')} className="min-h-11 justify-center rounded-full bg-[#155DFC] px-5">
                <Text className="text-sm font-semibold text-white">Choose location</Text>
              </Pressable>
            </>
          ) : isLoading ? (
            <>
              <BrowseLoadingText message={BROWSE_LOADING_COPY.grocery} />
              <Text className="text-center text-sm text-ink/60">Finding shops and their grocery picks…</Text>
            </>
          ) : isError ? (
            <>
              <Text className="text-center text-sm text-ink/60">We couldn’t load nearby shops. Please try again.</Text>
              <Pressable accessibilityRole="button" onPress={retry} className="min-h-11 justify-center rounded-full bg-[#155DFC] px-5">
                <Text className="text-sm font-semibold text-white">Try again</Text>
              </Pressable>
            </>
          ) : (
            <Text className="text-center text-sm text-ink/60">No nearby shops with available groceries right now.</Text>
          )}
        </View>
      )}
    </View>
  );
}

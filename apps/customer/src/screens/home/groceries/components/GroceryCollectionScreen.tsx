import { BrowseLoadingText, BROWSE_LOADING_COPY } from '../../loading/BrowseLoadingText';
import { Pressable, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../../../navigation/types';
import { CategoryDetailHeader } from '../../../category-detail/components/CategoryDetailHeader';
import type { Product } from '../../products/types';
import { GroceryProductTile } from './GroceryProductTile';
import { mapApiProduct } from '../../../../api/products';
import { useNearbyGroceryInventory } from '../useNearbyGroceryInventory';
import { selectBalancedProducts } from '../selectBalancedProducts';

interface Props {
  title: string;
  groups: RegExp[];
  previewProducts?: Product[];
}

export function GroceryCollectionScreen({ title, groups, previewProducts = [] }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { visibleProducts, hasLocation, isLoading, isError, retry } = useNearbyGroceryInventory();
  const realProducts = selectBalancedProducts(visibleProducts, groups, visibleProducts.length).map(mapApiProduct);
  const previewOnly = __DEV__ && process.env.EXPO_PUBLIC_ENABLE_DESIGN_PREVIEWS === 'true' && realProducts.length === 0 && previewProducts.length > 0;
  const products = previewOnly ? previewProducts : realProducts;

  return (
    <View className="flex-1 bg-white pt-safe">
      <StatusBar style="dark" />
      <CategoryDetailHeader title={title} onBack={() => navigation.goBack()} onSearch={() => navigation.navigate('Search')} />
      {previewOnly && <Text className="px-5 pb-2 text-[11px] text-ink/50">Design preview · Sample products and prices</Text>}
      {products.length > 0 ? (
        <FlashList
          data={products}
          numColumns={2}
          keyExtractor={(product) => product.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 }}
          renderItem={({ item }) => <View className="flex-1 px-1 pb-6"><GroceryProductTile product={item} previewOnly={previewOnly} /></View>}
        />
      ) : (
        <View className="flex-1 items-center justify-center gap-4 px-6">
          {!hasLocation ? (
            <>
              <Text className="text-center text-sm text-ink/60">Choose your delivery address to browse {title.toLowerCase()}.</Text>
              <Pressable accessibilityRole="button" onPress={() => navigation.navigate('SelectLocation')} className="min-h-12 justify-center rounded-2xl bg-coral px-5"><Text className="font-semibold text-ink">Choose location</Text></Pressable>
            </>
          ) : isLoading ? (
            <BrowseLoadingText message={BROWSE_LOADING_COPY.grocery} />
          ) : isError ? (
            <>
              <Text className="text-center text-sm text-ink/60">We couldn’t load {title.toLowerCase()}.</Text>
              <Pressable accessibilityRole="button" onPress={retry} className="min-h-12 justify-center rounded-2xl bg-coral px-5"><Text className="font-semibold text-ink">Try again</Text></Pressable>
            </>
          ) : (
            <Text className="text-center text-sm text-ink/60">No {title.toLowerCase()} available from nearby shops right now.</Text>
          )}
        </View>
      )}
    </View>
  );
}

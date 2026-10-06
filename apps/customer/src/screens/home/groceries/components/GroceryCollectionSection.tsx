import { BrowseLoadingText, BROWSE_LOADING_COPY } from '../../loading/BrowseLoadingText';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../../../navigation/types';
import { mapApiProduct } from '../../../../api/products';
import { SectionTitle } from '../../components/SectionTitle';
import { useNearbyGroceryInventory } from '../useNearbyGroceryInventory';
import { selectBalancedProducts } from '../selectBalancedProducts';
import type { Product } from '../../products/types';
import { GroceryProductTile } from './GroceryProductTile';
import { SeeAllProductsButton } from './SeeAllProductsButton';

interface Props {
  title: string;
  groups: RegExp[];
  maxProducts?: number;
  previewCount?: number;
  onViewMore?: () => void;
  previewProducts?: Product[];
}

export function GroceryCollectionSection({ title, groups, maxProducts = 8, previewCount, onViewMore, previewProducts = [] }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { visibleProducts, hasLocation, isLoading, isError, retry } = useNearbyGroceryInventory();
  const realProducts = selectBalancedProducts(visibleProducts, groups, previewCount ?? maxProducts).map(mapApiProduct);
  const previewOnly = __DEV__ && process.env.EXPO_PUBLIC_ENABLE_DESIGN_PREVIEWS === 'true' && realProducts.length === 0 && previewProducts.length > 0;
  const products = previewOnly ? previewProducts.slice(0, previewCount ?? maxProducts) : realProducts;

  return (
    <View className="pt-8">
      <SectionTitle>{title}</SectionTitle>

      {products.length > 0 ? (
        previewCount ? (
          <View className="px-5">
            {previewOnly && <Text className="mb-3 text-[11px] text-ink/50">Design preview · Sample products and prices</Text>}
            <View className="-mx-1 flex-row flex-wrap items-start gap-y-5">
              {products.map((product) => (
                <View key={product.id} className="px-1" style={{ width: '33.333333%' }}>
                  <GroceryProductTile product={product} previewOnly={previewOnly} />
                </View>
              ))}
            </View>
            {onViewMore && (
              <SeeAllProductsButton products={products} sectionTitle={title} onPress={onViewMore} />
            )}
          </View>
        ) : (
          <View>
            {previewOnly && <Text className="mb-3 px-5 text-[11px] text-ink/50">Design preview · Sample products and prices</Text>}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="items-start gap-3 px-5" snapToInterval={140} snapToAlignment="start" decelerationRate="fast">
              {products.map((product) => (
                <View key={product.id} className="w-32">
                  <GroceryProductTile product={product} previewOnly={previewOnly} />
                </View>
              ))}
            </ScrollView>
          </View>
        )
      ) : (
        <View className="mx-5 items-center gap-3 rounded-2xl bg-mist/50 px-5 py-6">
          {!hasLocation ? (
            <>
              <Text className="text-center text-sm text-ink/60">Choose your delivery address to see available products.</Text>
              <Pressable accessibilityRole="button" onPress={() => navigation.navigate('SelectLocation')} className="min-h-11 justify-center rounded-full bg-[#155DFC] px-5">
                <Text className="text-sm font-semibold text-white">Choose location</Text>
              </Pressable>
            </>
          ) : isLoading ? (
            <>
              <BrowseLoadingText message={BROWSE_LOADING_COPY.grocery} />
            </>
          ) : isError ? (
            <>
              <Text className="text-center text-sm text-ink/60">We couldn’t load these products. Please try again.</Text>
              <Pressable accessibilityRole="button" onPress={retry} className="min-h-11 justify-center rounded-full bg-[#155DFC] px-5">
                <Text className="text-sm font-semibold text-white">Try again</Text>
              </Pressable>
            </>
          ) : (
            <Text className="text-center text-sm text-ink/60">No {title.toLowerCase()} available from nearby shops right now.</Text>
          )}
        </View>
      )}
    </View>
  );
}

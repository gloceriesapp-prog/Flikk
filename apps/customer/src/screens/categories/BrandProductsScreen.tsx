import { useInfiniteQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FlashList } from '@shopify/flash-list';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { fetchBrandProducts } from '../../api/brands';
import { AppImage } from '../../components/AppImage';
import { IconlyArrowLeft } from '../../components/icons/iconly';
import { ScreenStatusBar } from '../../components/ScreenStatusBar';
import type { AppStackParamList } from '../../navigation/types';
import { useLocationStore } from '../../store/useLocationStore';
import { colors } from '../../theme/tokens';
import { GroceryProductTile } from '../home/groceries/components/GroceryProductTile';

type Props = NativeStackScreenProps<AppStackParamList, 'BrandProducts'>;

export function BrandProductsScreen({ navigation, route }: Props) {
  const { brand } = route.params;
  const location = useLocationStore(state => state.location);
  const query = useInfiniteQuery({
    queryKey: ['brand-products', brand.id, location?.latitude, location?.longitude],
    enabled: !!location,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) => fetchBrandProducts(brand.id, pageParam, signal),
    getNextPageParam: page => page.nextCursor ?? undefined,
  });
  const firstPage = query.data?.pages[0];
  const currentBrand = firstPage?.brand ?? brand;
  const products = query.data?.pages.flatMap(page => page.products) ?? [];
  const loadMore = () => {
    if (query.hasNextPage && !query.isFetching) void query.fetchNextPage();
  };

  return (
    <View className="flex-1 bg-white pt-safe">
      <ScreenStatusBar style="dark" />
      <View className="flex-row items-center gap-2 px-4 py-2">
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => navigation.goBack()}
          className="h-11 w-11 items-center justify-center">
          <IconlyArrowLeft size={22} color={colors.ink} />
        </Pressable>
        <Text accessibilityRole="header" numberOfLines={1} className="flex-1 text-xl font-bold text-ink">{currentBrand.name}</Text>
      </View>

      <FlashList
        data={products}
        numColumns={2}
        keyExtractor={product => product.id}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        onRefresh={location ? () => void query.refetch() : undefined}
        refreshing={query.isRefetching}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        ListHeaderComponent={currentBrand.imageUrl ? (
          <View className="mb-4 items-center rounded-2xl bg-gray-100 py-4">
            <AppImage source={{ uri: currentBrand.imageUrl }} style={{ width: 96, height: 96 }} contentFit="contain" />
          </View>
        ) : null}
        ListEmptyComponent={
          <View className="items-center gap-3 px-5 py-10">
            {!location ? (
              <Pressable accessibilityRole="button" onPress={() => navigation.navigate('SelectLocation')} className="min-h-11 justify-center px-4">
                <Text className="font-semibold text-primary">Choose delivery location</Text>
              </Pressable>
            ) : query.isPending ? <ActivityIndicator accessibilityLabel="Loading brand products" color={colors.ink} /> : query.isError ? (
              <Pressable accessibilityRole="button" onPress={() => void query.refetch()} className="min-h-11 justify-center px-4">
                <Text className="font-semibold text-primary">Couldn’t load products. Try again</Text>
              </Pressable>
            ) : <Text className="text-center text-sm text-ink/60">No products from this brand are available at your address.</Text>}
          </View>
        }
        ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator className="py-4" color={colors.ink} />
          : query.isFetchNextPageError ? (
            <Pressable accessibilityRole="button" onPress={loadMore} className="min-h-11 items-center justify-center">
              <Text className="font-semibold text-primary">Retry loading more</Text>
            </Pressable>
          ) : null}
        renderItem={({ item }) => (
          <View className="flex-1 px-1 pb-4"><GroceryProductTile product={item} /></View>
        )}
      />
    </View>
  );
}

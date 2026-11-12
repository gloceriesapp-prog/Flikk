import { useInfiniteQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { fetchAllPopularBrands } from '../../api/brands';
import { AppImage } from '../../components/AppImage';
import { IconlyArrowLeft } from '../../components/icons/iconly';
import { ScreenStatusBar } from '../../components/ScreenStatusBar';
import type { AppStackParamList } from '../../navigation/types';
import { colors } from '../../theme/tokens';

type Props = NativeStackScreenProps<AppStackParamList, 'AllBrands'>;

export function AllBrandsScreen({ navigation }: Props) {
  const query = useInfiniteQuery({
    queryKey: ['popular-brands', 'directory'],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) => fetchAllPopularBrands(pageParam, signal),
    getNextPageParam: page => page.nextCursor ?? undefined,
    staleTime: 60_000,
  });
  // Admin edits during pagination must not create duplicate React keys.
  const brands = [...new Map(query.data?.pages.flatMap(page => page.brands).map(brand => [brand.id, brand])).values()];
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
        <Text accessibilityRole="header" className="text-xl font-bold text-ink">Popular brands</Text>
      </View>
      <FlatList data={brands} numColumns={5} keyExtractor={brand => brand.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        onEndReached={loadMore} onEndReachedThreshold={0.4}
        onRefresh={() => void query.refetch()} refreshing={query.isRefetching}
        ListEmptyComponent={<View className="items-center gap-3 py-10">
          {query.isPending ? <ActivityIndicator accessibilityLabel="Loading brands" color={colors.ink} />
            : query.isError ? <Pressable accessibilityRole="button" onPress={() => void query.refetch()} className="min-h-11 justify-center">
              <Text className="font-semibold text-primary">Couldn’t load brands. Try again</Text>
            </Pressable> : <Text className="text-sm text-ink/60">Brands will appear here soon.</Text>}
        </View>}
        ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator className="py-4" color={colors.ink} />
          : query.isFetchNextPageError ? <Pressable accessibilityRole="button" onPress={loadMore} className="min-h-11 items-center justify-center">
            <Text className="font-semibold text-primary">Retry loading more</Text>
          </Pressable> : null}
        renderItem={({ item }) => <View style={{ width: '20%', paddingHorizontal: 4, paddingBottom: 16 }}>
          <Pressable accessibilityRole="button" accessibilityLabel={item.name}
            onPress={() => navigation.navigate('BrandProducts', { brand: item })}
            className="aspect-square overflow-hidden rounded-2xl bg-gray-100 active:opacity-75">
            <AppImage source={{ uri: item.imageUrl }} style={{ width: '100%', height: '100%' }} contentFit="contain" />
          </Pressable>
          <Text numberOfLines={2} className="mt-2 text-center text-xs font-medium text-ink">{item.name}</Text>
        </View>} />
    </View>
  );
}

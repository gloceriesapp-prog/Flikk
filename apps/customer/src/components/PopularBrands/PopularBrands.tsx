import { useQuery } from '@tanstack/react-query';
import { useIsFocused } from '@react-navigation/native';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { fetchPopularBrands, type PopularBrand } from '../../api/brands';
import { AppImage } from '../AppImage';

interface Props {
  onSelect: (brand: PopularBrand) => void;
  onSeeAll: () => void;
  previewLimit?: 5 | 10;
  alwaysShowSeeAll?: boolean;
}

export function PopularBrands({ onSelect, onSeeAll, previewLimit = 10, alwaysShowSeeAll = false }: Props) {
  const isFocused = useIsFocused();
  const query = useQuery({
    queryKey: ['popular-brands', 'preview'],
    queryFn: ({ signal }) => fetchPopularBrands(signal),
    enabled: isFocused,
    // Re-entering the screen refreshes saved admin selections; cached tiles stay visible.
    staleTime: 0,
    refetchInterval: isFocused ? 60_000 : false,
    retry: 1,
  });
  const brands = query.data ?? [];

  if (!brands.length && !query.isPending && !query.isError) return null;

  return (
    <View className="pt-3">
      <View className="mb-2 flex-row items-center justify-between px-5">
        <Text accessibilityRole="header" className="text-[17px] font-bold text-ink/90">Popular Brands</Text>
        {(alwaysShowSeeAll || brands.length > previewLimit) && <Pressable accessibilityRole="button" accessibilityLabel="See all brands"
          onPress={onSeeAll} className="min-h-11 justify-center pl-4">
          <Text className="text-sm font-semibold text-ink/70">See all</Text>
        </Pressable>}
      </View>
      {query.isPending && <ActivityIndicator accessibilityLabel="Loading popular brands" className="py-3" />}
      {query.isError && <Pressable accessibilityRole="button" accessibilityLabel="Retry popular brands"
        onPress={() => void query.refetch()} className="mx-5 mb-3 min-h-11 justify-center rounded-xl bg-gray-100 px-3 py-2">
        <Text className="text-sm text-ink/70">Couldn’t refresh brands. Tap to retry.</Text>
      </Pressable>}
      <View className="flex-row flex-wrap gap-y-2 px-4">
        {brands.slice(0, previewLimit).map(brand => (
          <View key={brand.id} style={styles.tile}>
            <Pressable accessibilityRole="button" accessibilityLabel={brand.name}
              onPress={() => onSelect(brand)} className="aspect-square overflow-hidden rounded-2xl bg-gray-100 active:opacity-75">
              <AppImage source={{ uri: brand.imageUrl }} style={StyleSheet.absoluteFill} contentFit="contain" />
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { width: '20%', paddingHorizontal: 4 },
});

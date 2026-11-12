import { useQuery } from '@tanstack/react-query';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fetchPopularBrands, type PopularBrand } from '../../../api/brands';
import { AppImage } from '../../../components/AppImage';

export function PopularBrands({ onSelect, onSeeAll }: { onSelect: (brand: PopularBrand) => void; onSeeAll: () => void }) {
  const { data: brands } = useQuery({
    queryKey: ['popular-brands'],
    queryFn: ({ signal }) => fetchPopularBrands(signal),
    staleTime: 60_000,
    retry: false,
  });

  if (!brands?.length) return null;

  return (
    <View className="pb-5 pt-3">
      <View className="mb-2 flex-row items-center justify-between px-5">
        <Text accessibilityRole="header" className="text-[17px] font-bold text-ink/90">Popular brands</Text>
        {brands.length > 10 && <Pressable accessibilityRole="button" accessibilityLabel="See all brands"
          onPress={onSeeAll} className="min-h-11 justify-center pl-4">
          <Text className="text-sm font-semibold text-ink/70">See all</Text>
        </Pressable>}
      </View>
      <View className="flex-row flex-wrap gap-y-2 px-4">
        {brands.slice(0, 10).map(brand => (
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

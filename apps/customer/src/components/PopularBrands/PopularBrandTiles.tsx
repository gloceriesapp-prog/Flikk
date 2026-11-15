import { Pressable, StyleSheet, View } from 'react-native';
import type { PopularBrand } from '../../api/brands';
import { AppImage } from '../AppImage';

export function PopularBrandTiles({ brands, onSelect }: {
  brands: PopularBrand[];
  onSelect: (brand: PopularBrand) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-y-2 px-4">
      {brands.map(brand => (
        <View key={brand.id} style={styles.tile}>
          <Pressable accessibilityRole="button" accessibilityLabel={brand.name}
            onPress={() => onSelect(brand)} className="aspect-square overflow-hidden rounded-2xl bg-gray-100 active:opacity-75">
            <AppImage source={{ uri: brand.imageUrl }} style={StyleSheet.absoluteFill} contentFit="contain" />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { width: '20%', paddingHorizontal: 4 },
});

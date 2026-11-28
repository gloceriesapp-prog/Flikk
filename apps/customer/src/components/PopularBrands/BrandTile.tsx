import { Pressable, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { PopularBrand } from '../../api/brands';
import { AppImage } from '../AppImage';

// One brand: a soft squircle. A pale-blue ring (fading from near-white at the
// top to light blue at the bottom) frames a white face with the logo centred.
// Size is the full tile side in points.
export function BrandTile({ brand, size, onPress }: { brand: PopularBrand; size: number; onPress: () => void }) {
  const radius = Math.round(size * 0.26);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={brand.name} onPress={onPress} className="active:opacity-80">
      <LinearGradient colors={['#F7FAFF', '#E4EDFF']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
        style={{ width: size, height: size, borderRadius: radius, padding: 3 }}>
        <View style={{ flex: 1, borderRadius: radius - 3, backgroundColor: '#FFFFFF', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
          <AppImage source={{ uri: brand.imageUrl }} style={{ width: size * 0.66, height: size * 0.66 }} contentFit="contain" accessible={false} />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

// Hero strip at the top of the Regional tab. Full-device-width regional.png
// banner sitting on the SAME per-category gradient HomeHeader uses for the
// Regional tab (categoryHeaderGradients.ts) — reused, not re-typed, so the
// banner never drifts out of sync with the header above it. The one change:
// its last stop is forced to pure white so the gradient melts into the white
// page below the banner with no visible seam.

import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppImage as Image } from '../../../components/AppImage';
import { gradientForTabName } from '../data/categoryHeaderGradients';

const REGIONAL = gradientForTabName('regional');

export function RegionalHeroBanner() {
  return (
    <LinearGradient
      colors={[REGIONAL.colors[0], REGIONAL.colors[1], REGIONAL.colors[2], '#FFFFFF']}
      locations={REGIONAL.stops}
    >
      <View className="px-5 pb-2 pt-4">
        <Image
          source={{ uri: 'https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/Images/regional.png' }}
          className="w-full aspect-[16/9]"
          resizeMode="contain"
        />
      </View>
    </LinearGradient>
  );
}

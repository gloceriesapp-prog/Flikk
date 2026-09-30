// Promo band — first thing in the scrollable body, directly under
// StoreFilterBar.
//
// Full-bleed across the physical device width even when rendered inside
// a parent with horizontal padding.
//
// The warm StoreHeader gradient continues through the promo area and
// softly fades into pure white at the bottom so the next #FFFFFF section
// joins seamlessly. Its TOP color is exactly StoreHeader's bottom color
// (#E6BFA8) so there's no visible seam/line where the pinned header meets
// this banner — the tone carries straight down into it, then fades out.

import { LinearGradient } from 'expo-linear-gradient';
import { useWindowDimensions, View } from 'react-native';

import { AppImage as Image } from '../../../components/AppImage';

const PROMO_IMAGE_URI =
  'https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/Images/store11.png';

const STORE_HEADER_GRADIENT = {
  colors: [
    // Start exactly on StoreHeader's ending tone (#D9EDF6) so the seam
    // disappears — the header color carries straight down into the banner,
    // then fades out to the white content area below. (Header restarting at
    // its own dark top #69A9D4 here would just paint a second dark band
    // right under the light header edge — the opposite of seamless.)
    '#D9EDF6',
    '#E6F2F9',
    '#F4F9FC',
    '#F8F7FC',
  ] as const,

  stops: [
    0,
    0.4,
    0.72,
    1,
  ] as const,
};

export function StorePromoBanner() {
  const { width: screenWidth } = useWindowDimensions();

  return (
    <View
      className="self-center overflow-hidden bg-white"
      style={{
        width: screenWidth,
        height: 160,
      }}
    >
      <LinearGradient
        colors={STORE_HEADER_GRADIENT.colors}
        locations={STORE_HEADER_GRADIENT.stops}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        className="flex-1"
      >
        <Image
          source={{ uri: PROMO_IMAGE_URI }}
          className="h-full w-full"
          contentFit="cover"
        />
      </LinearGradient>

      {/* Top feather — the promo PNG carries its own baked-in background, so
          matching the gradient underneath isn't enough to kill the hard line
          where the pinned header meets it. This opaque-header-tone →
          transparent strip is drawn OVER the image's top edge so the header
          color melts down into the banner instead of butting against it. */}
      <LinearGradient
        colors={['#D9EDF6', 'rgba(217,237,246,0)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 40 }}
        pointerEvents="none"
      />
    </View>
  );
}
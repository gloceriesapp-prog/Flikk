// Promo band — first thing in the scrollable body, directly under
// StoreFilterBar. No backdrop photo anymore — per an explicit ask, this
// is now a real extension of StoreHeader.tsx's own gradient (same 4-stop
// indigo/sapphire family, STORE_HEADER_GRADIENT there) reading straight
// through into this band, with centered text instead of an image. A
// bottom fade (transparent -> the real #FCFCFB StoreListScreen.tsx paints
// its own background with) blends this band's bottom edge into the page
// below it instead of ending on a hard line.

import { LinearGradient } from 'expo-linear-gradient';
import { Text, View } from 'react-native';

// Same real 4-stop gradient StoreHeader.tsx's own STORE_HEADER_GRADIENT
// uses — reading the header straight through into this band is what
// actually makes the two feel like one continuous surface, not two
// separately-colored blocks.
const HEADER_GRADIENT = {
  colors: ['#04050F', '#0A0E2E', '#141B52', '#232E7A'] as const,
  stops: [0, 0.35, 0.68, 1] as const,
};

// Same real background StoreListScreen.tsx paints its own root View with —
// the mask below fades into this exact color, not a guessed white, so the
// seam between this band and the page is invisible.
const PAGE_BG = '#FCFCFB';

export function StorePromoBanner() {
  return (
    <View className="w-full overflow-hidden" style={{ height: 140 }}>
      <LinearGradient colors={HEADER_GRADIENT.colors} locations={HEADER_GRADIENT.stops} style={{ flex: 1 }}>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-lg font-semibold text-white">Fresh picks from local stores, delivered fast.</Text>
        </View>
      </LinearGradient>

      {/* CSS-masking-style bottom fade — transparent down to a fully
          opaque PAGE_BG at the very bottom, so the gradient dissolves
          into the real page background instead of cutting off hard. */}
      <LinearGradient
        colors={['transparent', PAGE_BG]}
        locations={[0, 1]}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 60 }}
      />
    </View>
  );
}

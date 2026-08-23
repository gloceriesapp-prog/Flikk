// One-shot celebration banner — BottomNavBar.tsx mounts this only for the
// couple of seconds right after the cart crosses FREE_DELIVERY_THRESHOLD
// (the crossing is detected there, not here; this component just renders
// whatever it's told to and calls onFinish when its timer's up). Full width
// (not a pill like FreeDeliveryBar/CartBar) — a one-time event deserves more
// visual weight than the row it replaces, but the same *height/shape* as
// those pills (py-2, rounded-full, thin outer ring) — an explicit ask to
// size it consistently with CartBar rather than being taller.
//
// White-to-lime gradient (this app's own brand color, not a foreign blue) —
// the delivery-bike graphic sits inline at a normal badge size (40px) on the
// white end rather than oversized/bleeding off the edge, so it reads as a
// clean icon instead of a burst effect. Text is `ink`, not white — this
// app's own design-token note: white text on a lime surface fails AA
// contrast, and a white-to-lime gradient is white (or close to it) under
// where the text sits for at least part of its width, so `ink` is the only
// choice that stays readable across the whole gradient, not just the lime
// end.

import { useEffect } from 'react';
import { Image, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/tokens';
import { CART_DELIVERY_FEE } from '../../store/useCartStore';

const VISIBLE_DURATION_MS = 2200;
const BIKE_IMAGE_URI = 'https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/app-images/bike-bg.png';

interface Props {
  onFinish: () => void;
}

export function FreeDeliveryUnlockBanner({ onFinish }: Props) {
  useEffect(() => {
    const timer = setTimeout(onFinish, VISIBLE_DURATION_MS);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <View className="shadow-lg shadow-black/30">
      {/* LinearGradient isn't one of NativeWind's auto-patched components —
          a className here is silently ignored, same gotcha as elsewhere in
          this app. rounded-full + a thin light ring, same as CartBar's own
          glass pill, so this reads as the same family of control instead of
          a differently-shaped banner. */}
      <LinearGradient
        colors={['#FFFFFF', colors.limeSoft, colors.lime, colors.limeDeep]}
        locations={[0, 0.28, 0.6, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ borderRadius: 999, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)', paddingVertical: 8, paddingLeft: 8 }}
      >
        <View className="flex-row items-center gap-2">
          <Image source={{ uri: BIKE_IMAGE_URI }} resizeMode="contain" style={{ width: 44, height: 44 }} />

          <View className="flex-1 items-center gap-0 pr-8">
            <Text className="text-[13px] font-medium text-ink">Free delivery unlocked</Text>
            <Text className="text-[13px] font-semibold text-ink">₹{CART_DELIVERY_FEE} Saved</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

// Floating bar shown right above BottomNavBar's pill whenever the cart has
// items — rendered from inside BottomNavBar.tsx itself so every screen gets
// it for free instead of each screen needing to remember to add it.
// Content-width and centered (not stretched edge-to-edge) — an overlapping
// stack of product thumbnails on the left instead of a plain cart icon, a
// bold "View cart" + item count in the middle, an arrow-right pill on the
// right. No price shown, per an explicit ask. Dark iOS glass (same
// systemThickMaterialDark + black wash as BottomNavBar's own pill), not a
// flat black fill. Renders nothing when the cart is empty.

import { ArrowRight02Icon } from '@hugeicons/core-free-icons';
import { Image, Pressable, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppIcon } from '../AppIcon';
import { PLACEHOLDER_IMAGE_URI } from '../../theme/placeholderImage';
import { colors } from '../../theme/tokens';
import { selectCartTotalQuantity, useCartStore } from '../../store/useCartStore';
import type { AppStackParamList } from '../../navigation/types';

const MAX_THUMBNAILS = 3;

interface Props {
  bottomOffset: number;
}

export function CartBar({ bottomOffset }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const items = useCartStore((state) => state.items);
  const totalQuantity = useCartStore(selectCartTotalQuantity);

  if (totalQuantity === 0) return null;

  const thumbnailCount = Math.min(items.length, MAX_THUMBNAILS);

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: bottomOffset, alignItems: 'center' }}>
      {/* Shadow lives on this outer, non-clipping wrapper — same reason as
          BottomNavBar.tsx: BlurView needs overflow:hidden to clip its
          rounded corners, which would also clip the shadow. */}
      <Pressable onPress={() => navigation.navigate('Cart')} className="shadow-lg shadow-black/30">
        {/* BlurView isn't one of NativeWind's auto-patched components — a
            className here is silently ignored, same gotcha as elsewhere in
            this app. systemThickMaterialDark = the real iOS "thick
            material" dark glass. */}
        <BlurView intensity={95} tint="systemThickMaterialDark" style={{ borderRadius: 999, overflow: 'hidden' }}>
          {/* mutes whatever's behind the bar so it reads as neutral dark
              glass, not tinted by the content underneath */}
          <View className="absolute inset-0 bg-black/55" />

          <View className="flex-row items-center gap-3 py-2 pl-2 pr-2">
            <View className="flex-row">
              {Array.from({ length: thumbnailCount }).map((_, i) => (
                <View
                  key={i}
                  style={{ marginLeft: i === 0 ? 0 : -14, zIndex: thumbnailCount - i }}
                  className="h-9 w-9 overflow-hidden rounded-full border-2 border-black/40 bg-white"
                >
                  <Image source={{ uri: PLACEHOLDER_IMAGE_URI }} className="h-full w-full" resizeMode="cover" />
                </View>
              ))}
            </View>

            <View>
              <Text className="text-sm font-extrabold text-white">View cart</Text>
              <Text className="text-xs font-medium text-white/50">
                {totalQuantity} {totalQuantity === 1 ? 'item' : 'items'}
              </Text>
            </View>

            <View className="h-10 w-10 items-center justify-center rounded-full bg-lime">
              <AppIcon icon={ArrowRight02Icon} size={17} color={colors.ink} />
            </View>
          </View>
        </BlurView>
      </Pressable>
    </View>
  );
}

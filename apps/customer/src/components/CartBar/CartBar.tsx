// Floating bar shown right above BottomNavBar's pill whenever the cart has
// items — rendered from inside BottomNavBar.tsx itself so every screen gets
// it for free instead of each screen needing to remember to add it.
// Content-width (not stretched) — a bold "View cart" + item count in the
// middle, an arrow-right pill on the right. No price shown, per an explicit
// ask. Dark glass — plus a thin white/14% outer ring, the usual liquid-glass
// "edge catches the light" cue. Renders nothing when the cart is empty.
//
// Left badge and right arrow circle are the same 36px size with the same
// 8px padding to their respective pill edge (px-2, not pl-2/pr-3) — with the
// arrow circle bigger (40px) than the left badge, the two caps of the
// rounded-999 pill curved differently and the right one read as flatter/
// less round than the left. Matching both ends' geometry exactly is what
// makes the pill actually look like a symmetric stadium shape instead of
// lopsided.
//
// Left side is one of two things, not always the product-thumbnail stack:
// while delivery is still locked (FreeDeliveryBar is showing alongside this
// bar), a single ShoppingBagAddIcon badge instead — the real per-item photos
// only start once delivery unlocks, right after FreeDeliveryUnlockBanner
// plays, per an explicit ask. Thumbnails are borderless (avatars only, not a
// border-2 ring) per an earlier explicit ask.
//
// Not self-positioned/self-centered — BottomNavBar.tsx renders this as the
// right-hand item in a row shared with FreeDeliveryBar (flex-shrink-0, so it
// keeps its natural width and FreeDeliveryBar is the one that gives up space
// on a narrow screen), not each bar independently absolute-positioned and
// overlapping.
//
// tint="dark" + a low black wash, not tint="systemThickMaterialDark" + a
// heavy one — "systemThickMaterialDark" is an iOS-only enum value that
// silently falls back to a flat opaque tint wherever the native blur
// backend isn't available (Android, or an Expo Go/simulator build without
// it), which read as a solid black bar instead of glass. "dark" is the
// cross-platform tint (same one ProductDetailSheet's backdrop uses), and
// intensity needs to be high with the wash kept low — too much black on top
// of the blur is what was making it look flat and opaque in the first
// place, same fix as that backdrop's own tuning.

import { ArrowRight02Icon, ShoppingBagAddIcon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { AppImage as Image } from '../AppImage';
import { BlurView } from 'expo-blur';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppIcon } from '../AppIcon';
import { PLACEHOLDER_IMAGE_URI } from '../../theme/placeholderImage';
import { FREE_DELIVERY_THRESHOLD, selectCartTotalPrice, selectCartTotalQuantity, useCartStore } from '../../store/useCartStore';
import type { AppStackParamList } from '../../navigation/types';

const MAX_THUMBNAILS = 3;

export function CartBar() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const items = useCartStore((state) => state.items);
  const totalQuantity = useCartStore(selectCartTotalQuantity);
  const isDeliveryUnlocked = useCartStore((state) => selectCartTotalPrice(state) >= FREE_DELIVERY_THRESHOLD);

  if (totalQuantity === 0) return null;

  const thumbnailCount = Math.min(items.length, MAX_THUMBNAILS);

  return (
    // Shadow lives on this outer, non-clipping wrapper — same reason as
    // BottomNavBar.tsx: BlurView needs overflow:hidden to clip its rounded
    // corners, which would also clip the shadow. flex-shrink-0 so the row
    // in BottomNavBar.tsx never squeezes this bar's own width.
    <View className="shrink-0 shadow-lg shadow-black/30">
      <Pressable onPress={() => navigation.navigate('Cart')}>
        {/* BlurView isn't one of NativeWind's auto-patched components — a
            className here is silently ignored, same gotcha as elsewhere in
            this app. */}
        <BlurView
          intensity={90}
          tint="dark"
          style={{ borderRadius: 999, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' }}
        >
          {/* mutes whatever's behind the bar just enough to read as neutral
              dark glass, without going opaque and hiding the blur */}
          <View className="absolute inset-0 bg-black/15" />

          <View className="flex-row items-center gap-3 px-3 py-2">
            {isDeliveryUnlocked ? (
              <View className="flex-row">
                {items.slice(0, thumbnailCount).map((item, i) => (
                  <View
                    key={item.id}
                    style={{ marginLeft: i === 0 ? 0 : -14, zIndex: thumbnailCount - i }}
                    className="h-9 w-9 overflow-hidden rounded-full bg-white"
                  >
                    <Image source={{ uri: item.imageUrl || PLACEHOLDER_IMAGE_URI }} className="h-full w-full" resizeMode="cover" />
                  </View>
                ))}
              </View>
            ) : (
              <View className="h-9 w-9 items-center justify-center rounded-full bg-white/15">
                <AppIcon icon={ShoppingBagAddIcon} size={17} color="#FFFFFF" />
              </View>
            )}

            <View>
              <Text className="text-sm font-semibold text-white">View cart</Text>
              <Text className="text-xs font-medium text-white/50">
                {totalQuantity} {totalQuantity === 1 ? 'item' : 'items'}
              </Text>
            </View>

            <View className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: '#2457F5' }}>
              <AppIcon icon={ArrowRight02Icon} size={16} color="#FFFFFF" />
            </View>
          </View>
        </BlurView>
      </Pressable>
    </View>
  );
}

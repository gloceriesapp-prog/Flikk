// Floating bar shown right above BottomNavBar's pill whenever the cart has
// items — rendered from inside BottomNavBar.tsx itself so every screen gets
// it for free instead of each screen needing to remember to add it.
//
// Two separate capsules, per an explicit reference sketch — not one
// continuous pill anymore. Left: a capsule holding the overlapping
// item-photo stack plus a "+N more" label once the cart holds more than
// MAX_THUMBNAILS items. Right: a solid black "View cart" capsule with the
// arrow. Both sit in the same Pressable row so a tap anywhere across
// either capsule opens Cart.
//
// Left capsule always shows real per-item photos (up to MAX_THUMBNAILS),
// never a generic bag icon — "+N more" covers whatever's left beyond that.
//
// Not self-positioned/self-centered — BottomNavBar.tsx renders this as the
// right-hand item in a row shared with FreeDeliveryBar (flex-shrink-0, so it
// keeps its natural width and FreeDeliveryBar is the one that gives up space
// on a narrow screen), not each bar independently absolute-positioned and
// overlapping.

import { ArrowRight02Icon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { AppImage as Image } from '../AppImage';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppIcon } from '../AppIcon';
import { PLACEHOLDER_IMAGE_URI } from '../../theme/placeholderImage';
import { selectCartTotalQuantity, useCartStore } from '../../store/useCartStore';
import type { AppStackParamList } from '../../navigation/types';

const MAX_THUMBNAILS = 3;

export function CartBar() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const items = useCartStore((state) => state.items);
  const totalQuantity = useCartStore(selectCartTotalQuantity);

  if (totalQuantity === 0) return null;

  const thumbnailCount = Math.min(items.length, MAX_THUMBNAILS);
  const moreCount = items.length - thumbnailCount;

  return (
    <Pressable onPress={() => navigation.navigate('Cart')} className="shrink-0 flex-row items-center gap-2">
      {/* Left capsule — shadow lives on this outer, non-clipping wrapper so
          the rounded-full clip below doesn't also clip the shadow. */}
      <View className="shadow-lg shadow-black/30">
        <View className="h-12 flex-row items-center gap-1.5 overflow-hidden rounded-full border border-white/10 bg-[#000000]/90 pl-1.5 pr-3">
          <View className="flex-row">
            {items.slice(0, thumbnailCount).map((item, i) => (
              <View
                key={item.id}
                style={{ marginLeft: i === 0 ? 0 : -12, zIndex: thumbnailCount - i }}
                className="h-9 w-9 overflow-hidden rounded-full border-2 border-black bg-white"
              >
                <Image source={{ uri: item.imageUrl || PLACEHOLDER_IMAGE_URI }} className="h-full w-full" resizeMode="cover" />
              </View>
            ))}
          </View>

          {moreCount > 0 ? <Text className="text-[12px] font-semibold text-white/60">+{moreCount} more</Text> : null}
        </View>
      </View>

      {/* Right capsule — solid black "View cart" pill. Its h-12 is the
          height both capsules share; the left one matches it exactly
          rather than each sizing independently off its own content. */}
      <View className="shadow-lg shadow-black/30">
        <View className="h-12 flex-row items-center gap-2 overflow-hidden rounded-full border border-white/10 bg-[#000000]/90 pl-4 pr-2">
          <Text className="text-sm font-medium text-white">View cart</Text>
          <View className="h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: '#00a63e' }}>
            <AppIcon icon={ArrowRight02Icon} size={14} color="#FFFFFF" />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

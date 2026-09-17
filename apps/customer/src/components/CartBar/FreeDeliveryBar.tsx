// Floating pill shown to the left of CartBar (same row, same glass
// convention) whenever the cart has items AND delivery is still locked
// ("Shop for ₹X more" with a scooter icon). Once selectCartTotalPrice
// crosses the real freeDeliveryThreshold this renders nothing —
// BottomNavBar.tsx shows a one-shot FreeDeliveryUnlockBanner at the moment
// of crossing, then drops back to a plain centered CartBar with no left
// pill at all, matching the reference (delivery unlocked isn't an ongoing
// state worth a permanent pill, just a moment). Renders nothing at all
// while free delivery is disabled (useDeliverySettings, api/
// deliverySettings.ts) — same admin toggle BillDetailsCard reads, so this
// promo pill can't advertise something checkout won't actually honor.
// Display/incentive only either way — this doesn't change what checkout
// actually charges, that's computed independently in useCartStore.ts.
//
// Light glass (not CartBar's dark glass) with a lime-soft wash, so the two
// pills read as a matched pair without being identical while both are
// visible — CartBar is the primary action (navigates to Cart), this is
// informational.
//
// Not self-positioned — BottomNavBar.tsx renders this as the left-hand item
// in a row shared with CartBar. shrink (not shrink-0) so this is the bar
// that gives up width on a narrow screen — CartBar keeps its natural size,
// this one's text truncates instead of the two pills overlapping.

import { Scooter01Icon } from '@hugeicons/core-free-icons';
import { Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { AppIcon } from '../AppIcon';
import { colors } from '../../theme/tokens';
import { DEFAULT_DELIVERY_SETTINGS, useDeliverySettings } from '../../api/deliverySettings';
import { selectCartTotalPrice, useCartStore } from '../../store/useCartStore';

export function FreeDeliveryBar() {
  const totalPrice = useCartStore(selectCartTotalPrice);
  const itemCount = useCartStore((state) => state.items.length);
  const { data: deliverySettings = DEFAULT_DELIVERY_SETTINGS } = useDeliverySettings();

  const remaining = deliverySettings.freeDeliveryThreshold - totalPrice;
  if (!deliverySettings.freeDeliveryEnabled || itemCount === 0 || remaining <= 0) return null;

  return (
    // Shadow lives on this outer, non-clipping wrapper — same reason as
    // CartBar/BottomNavBar: BlurView needs overflow:hidden to clip its
    // rounded corners, which would also clip the shadow.
    <View className="shrink">
      {/* BlurView isn't one of NativeWind's auto-patched components — a
          className here is silently ignored, same gotcha as elsewhere in
          this app. */}
      <BlurView
        intensity={80}
        tint="light"
        style={{ borderRadius: 999, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(124,181,24,0.25)' }}
      >
        <View className="absolute inset-0 bg-lime-soft/50" />

        <View className="flex-row items-center gap-2.5 py-2 pl-2 pr-4">
          <View className="h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white">
            <AppIcon icon={Scooter01Icon} size={18} color={colors.limeDeep} />
          </View>

          <View className="shrink">
            <Text className="text-[13px] font-medium text-ink" numberOfLines={1}>
              Unlock FREE Delivery
            </Text>
            <Text className="text-xs text-ink/50" numberOfLines={1}>
              Shop for ₹{remaining} more
            </Text>
          </View>
        </View>
      </BlurView>
    </View>
  );
}

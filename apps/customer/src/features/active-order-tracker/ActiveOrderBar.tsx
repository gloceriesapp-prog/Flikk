// The floating "active order" tracker pill — a white rounded card that sits
// just above the bottom nav whenever the customer has an in-flight order and
// taps through to TrackOrder. All data/logic lives in useActiveOrder (one
// shared purchase-history query, no fetch of its own); this file is purely
// presentational + the tap handler. Renders null when there's no active
// order, so mounting it costs a visible bar only while one exists.

import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../components/AppIcon';
import type { AppStackParamList } from '../../navigation/types';
import { activeOrderLabel } from './activeOrderLabel';
import { computeDisplayEta } from './activeOrderEta';
import { useActiveOrder } from './useActiveOrder';
import { useBrowseClock } from '../../utils/useBrowseClock';

// Mirrors BottomNavBar's own PILL_HEIGHT (73) — kept as a local constant
// rather than importing that file's private layout internals. GAP is the
// calibration knob for breathing room above the nav bar; nudge it if the
// bar ever reads too tight/loose against the pill on a given device.
// ponytail: shares the "just above the nav" band with CartBar — after
// checkout clears the cart the two don't coexist in practice, so no
// stacking logic. Add vertical stacking the day a non-empty cart + an
// active order genuinely need to show at once.
const BOTTOM_NAV_HEIGHT = 73;
const GAP = 12;

export function ActiveOrderBar() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const insets = useSafeAreaInsets();
  // Shared 30s clock (no per-card timer) — re-renders the pill so the ETA
  // ticks down and rolls over without the full tracking screen's 1s clock.
  const now = useBrowseClock();
  const active = useActiveOrder();
  if (!active) return null;

  const { orderId, isTrip, statusKey, deadlineMs, baseMinutes, storeName } = active;
  const title = activeOrderLabel(statusKey);
  const mins = computeDisplayEta({ deadlineMs, baseMinutes, nowMs: now });

  return (
    // box-none: the empty margins around the pill pass taps through to the
    // screen underneath; only the Pressable itself captures them.
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + BOTTOM_NAV_HEIGHT + GAP }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Track order, ${title}`}
        // paymentMethodLabel is required by the route but unused for this
        // entry point (TrackOrder re-fetches the order) — same empty-string
        // the deep-link path (navigation/linking.ts) already passes.
        onPress={() => navigation.navigate('TrackOrder', { orderId, isTrip, paymentMethodLabel: '' })}
        className="flex-row items-center gap-3 rounded-[16px] bg-white px-3 py-2.5 active:opacity-90"
        style={{ shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 6 }}
      >
        {/* ETA badge — lime brand surface with ink text (white on lime fails
            AA, per the design system). Live countdown via computeDisplayEta:
            never shows 0 — once the recorded deadline passes it restarts from
            the order's reset window (15 min, or 10 for a short order). */}
        <View className="h-12 w-12 items-center justify-center rounded-xl bg-lime">
          <Text className="text-[20px] font-extrabold leading-[22px] text-ink">{mins}</Text>
          <Text className="text-[10px] font-semibold leading-[12px] text-ink">mins</Text>
        </View>

        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="text-[15px] font-bold leading-[19px] text-ink">{title}</Text>
          <Text numberOfLines={1} className="text-[13px] leading-[17px] text-ink/50">{storeName}</Text>
        </View>

        {/* Subtle circle + chevron affordance */}
        <View className="h-8 w-8 items-center justify-center rounded-full bg-mist">
          <AppIcon icon={ArrowRight01Icon} size={18} color="#101C10" strokeWidth={2.5} />
        </View>
      </Pressable>
    </View>
  );
}

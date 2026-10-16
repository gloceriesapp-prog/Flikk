// The floating "active order" tracker pill — a white rounded card that sits
// just above the bottom nav whenever the customer has an in-flight order and
// taps through to TrackOrder. All data/logic lives in useActiveOrder (one
// shared purchase-history query, no fetch of its own); this file is purely
// presentational + the tap handler. Renders null when there's no active
// order, so mounting it costs a visible bar only while one exists.

import { useContext, useEffect } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/tokens';
import { HomeNavigationProgressContext } from '../../navigation/home/HomeNavigationProgressContext';
import type { AppStackParamList } from '../../navigation/types';
import { activeOrderLabel } from './activeOrderLabel';
import { computeDisplayEta } from './activeOrderEta';
import { useActiveOrder } from './useActiveOrder';
import { useBrowseClock } from '../../utils/useBrowseClock';

// Mirrors BottomNavBar's own layout math (kept local rather than importing
// that file's private internals): PILL_HEIGHT 73, and the pill's own bottom
// offset (-10 on iOS where it floats above the safe area, 0 on Android where
// it sits flush). GAP is the tight breathing room above the pill — matched to
// CartBar's own +4. The home shell places CartBar above this card using its
// measured height, so both remain visible as the navigation bar animates.
const PILL_HEIGHT = 73;
const NAV_BOTTOM_OFFSET = Platform.OS === 'android' ? 0 : -10;
const GAP = 4;

export function ActiveOrderBar({ onHeightChange }: { onHeightChange?: (height: number) => void }) {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const insets = useSafeAreaInsets();
  // Shared 30s clock (no per-card timer) — re-renders the pill so the ETA
  // ticks down and rolls over without the full tracking screen's 1s clock.
  const now = useBrowseClock();
  // Same scroll progress the BottomNavBar hides on (HomeNavigationShell owns
  // it, provided via context). localHidden keeps hook order stable on any
  // surface that doesn't provide it. The card slides DOWN by PILL_HEIGHT in
  // lockstep with the nav hiding — so when the pill slides away on scroll,
  // this drops to the bottom edge instead of floating in the gap it left.
  const localHidden = useSharedValue(0);
  const navProgress = useContext(HomeNavigationProgressContext) ?? localHidden;
  const slideStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(navProgress.value, [0, 1], [0, PILL_HEIGHT]) }],
  }));
  const active = useActiveOrder();
  const hasActiveOrder = !!active;
  useEffect(() => {
    if (!hasActiveOrder) onHeightChange?.(0);
  }, [hasActiveOrder, onHeightChange]);
  if (!active) return null;

  const { orderId, isTrip, statusKey, deadlineMs, baseMinutes } = active;
  const title = activeOrderLabel(statusKey);
  const mins = computeDisplayEta({ deadlineMs, baseMinutes, nowMs: now });

  return (
    // box-none: the empty margins around the pill pass taps through to the
    // screen underneath; only the Pressable itself captures them. slideStyle
    // drops it to the bottom in lockstep with the nav bar on scroll.
    <Animated.View
      pointerEvents="box-none"
      style={[{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + NAV_BOTTOM_OFFSET + PILL_HEIGHT + GAP }, slideStyle]}
    >
      <Pressable
        onLayout={(event) => onHeightChange?.(event.nativeEvent.layout.height)}
        accessibilityRole="button"
        accessibilityLabel={`Track order, ${title}`}
        // paymentMethodLabel is required by the route but unused for this
        // entry point (TrackOrder re-fetches the order) — same empty-string
        // the deep-link path (navigation/linking.ts) already passes.
        onPress={() => navigation.navigate('TrackOrder', { orderId, isTrip, paymentMethodLabel: '' })}
        className={`w-full flex-row items-center gap-3 self-center rounded-[22px] border bg-white px-2.5 py-2.5 active:opacity-90 ${Platform.OS === 'android' ? 'border-gray-200' : 'border-ink/5'}`}
        // Android: no elevation shadow — a flat gray-100 border is the only
        // edge treatment. iOS keeps its own soft drop shadow + ink border.
        style={{ maxWidth: 330, shadowColor: '#101C10', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: Platform.OS === 'android' ? 0 : 8 }}
      >
        {/* ETA badge — lime→deep diagonal gradient with ink text (white on
            lime fails AA, per the design system). Live countdown via
            computeDisplayEta: never shows 0 — once the recorded deadline
            passes it restarts from the order's reset window (15 min, 10 for a
            short order). */}
        <LinearGradient
          colors={[colors.lime, colors.limeDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ height: 46, width: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text className="text-[19px] font-extrabold leading-[21px] text-ink">{mins}</Text>
          <Text className="text-[9px] font-semibold uppercase leading-[11px] tracking-wide text-ink/80">mins</Text>
        </LinearGradient>

        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="text-[15px] font-bold leading-[19px] text-ink">{title}</Text>
          <Text numberOfLines={1} className="text-[12.5px] font-semibold leading-[16px] text-ink/80">Gloceries</Text>
        </View>

        {/* Subtle circle + chevron affordance */}
        <View className="h-8 w-8 items-center justify-center rounded-full bg-lime-soft">
          <AppIcon icon={ArrowRight01Icon} size={18} color="#101C10" strokeWidth={2.5} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

// Discount label under a product's price. Below PRICE_DROP_THRESHOLD it's
// just a plain static "X% cheaper" (green) — most discounts on this app
// are modest, an animation on every single card would be noisy, not
// premium. At/above the threshold (a genuinely steep cut, per an explicit
// ask: "more than 15%") it rotates forever between that same "X% cheaper"
// text and a bolder red "Price Drop" call-out — 2s fully visible, then a
// smooth crossfade to the other, repeating indefinitely.
//
// Driven entirely by reanimated's own animation-completion callbacks, not
// a JS setInterval — each half-cycle's fade-out only ever schedules the
// next half-cycle from inside its own `withTiming` completion callback
// (fired by the UI thread the instant that animation genuinely finishes).
// A setInterval-driven version of this (an earlier pass) is the wrong
// shape for something living inside horizontally-scrolling rows/grids
// (PromoListCard, ProductSection): JS-thread timers get delayed or
// dropped while the JS thread is busy handling an active scroll gesture,
// which is exactly when a "rotating" badge would visibly stall instead of
// rotating. Animation-completion callbacks fire from the UI thread
// itself, independent of JS-thread scroll-handling load — the actual fix
// for "it should rotate" reliably, not just once.

import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

interface Props {
  discountPercent: number;
}

const PRICE_DROP_THRESHOLD = 15;
// "2 sec" per an explicit ask — how long each state (the % text, then
// "Price Drop") stays fully visible before the next crossfade starts.
const HOLD_MS = 2000;
const FADE_MS = 350;
const FADE_EASING = Easing.inOut(Easing.quad);

export function PriceDropBadge({ discountPercent }: Props) {
  const isSteepDrop = discountPercent >= PRICE_DROP_THRESHOLD;
  const [showingPriceDrop, setShowingPriceDrop] = useState(false);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (!isSteepDrop) return;
    let isMounted = true;

    // One self-perpetuating half-cycle: fade the current text fully in,
    // hold it, fade it out, then — only once that fade-out has actually
    // finished on the UI thread — flip which string is showing and start
    // the next half-cycle for it. Runs forever until the effect cleans up.
    function runHalfCycle() {
      opacity.value = withSequence(
        withTiming(1, { duration: FADE_MS, easing: FADE_EASING }),
        withTiming(1, { duration: HOLD_MS }),
        withTiming(0, { duration: FADE_MS, easing: FADE_EASING }, (finished) => {
          'worklet';
          if (finished) runOnJS(advance)();
        }),
      );
    }

    function advance() {
      if (!isMounted) return;
      setShowingPriceDrop((prev) => !prev);
      runHalfCycle();
    }

    runHalfCycle();
    return () => {
      isMounted = false;
      cancelAnimation(opacity);
    };
    // opacity (useSharedValue) is a stable ref-like object across renders,
    // same reasoning a ref is left out of a dependency array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSteepDrop]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  if (!isSteepDrop) {
    return <Text className="text-[13px] font-semibold text-[#00A650]">{discountPercent}% cheaper</Text>;
  }

  return (
    <Animated.Text
      style={animatedStyle}
      className={showingPriceDrop ? 'text-[13px] font-semibold text-danger' : 'text-[13px] font-semibold text-[#00A650]'}
    >
      {showingPriceDrop ? 'Price Drop' : `${discountPercent}% cheaper`}
    </Animated.Text>
  );
}

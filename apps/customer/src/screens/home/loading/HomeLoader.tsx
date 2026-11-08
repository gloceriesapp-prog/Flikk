// Home's first-open loader (useHomeReady decides when it goes). A calm,
// branded moment instead of a blank or half-built page: a basket in a soft
// pulsing ring, and a line that steps through what is really happening. The
// first line also covers the shop check before an address is resolved.
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { ShoppingBasket01Icon } from '@hugeicons/core-free-icons';
import Animated, { Easing, FadeIn, FadeOut, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { AppIcon } from '../../../components/AppIcon';

const BLUE = '#155DFC';
export const HOME_LOADER_LINES = ['Finding shops near you', 'Checking what’s fresh today', 'Getting your store ready'];
const LINE_MS = 1300;

export function HomeLoader() {
  const reduceMotion = useReducedMotion();
  const [line, setLine] = useState(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    // Steps forward and stays on the last line rather than looping back.
    const timer = setInterval(() => setLine((i) => Math.min(i + 1, HOME_LOADER_LINES.length - 1)), LINE_MS);
    if (!reduceMotion) pulse.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }), -1, false);
    return () => clearInterval(timer);
  }, [pulse, reduceMotion]);

  const ringStyle = useAnimatedStyle(() => ({ opacity: 0.35 * (1 - pulse.value), transform: [{ scale: 1 + pulse.value * 0.7 }] }));

  return (
    <View accessibilityRole="progressbar" accessibilityLabel={HOME_LOADER_LINES[line]} className="flex-1 items-center justify-center bg-white px-8">
      <View className="h-24 w-24 items-center justify-center">
        <Animated.View style={[{ position: 'absolute', width: 96, height: 96, borderRadius: 48, backgroundColor: BLUE }, ringStyle]} />
        <View className="h-20 w-20 items-center justify-center rounded-full bg-[#EDF3FF]">
          <AppIcon icon={ShoppingBasket01Icon} size={36} color={BLUE} strokeWidth={1.8} />
        </View>
      </View>
      <View className="mt-8 h-8 items-center justify-center">
        <Animated.Text key={line} entering={reduceMotion ? undefined : FadeIn.duration(260)} exiting={reduceMotion ? undefined : FadeOut.duration(160)}
          className="text-center text-[18px] font-semibold text-ink">
          {HOME_LOADER_LINES[line]}…
        </Animated.Text>
      </View>
      <Text className="mt-1.5 text-center text-[13px] text-ink/50">From local shops, to your door</Text>
    </View>
  );
}

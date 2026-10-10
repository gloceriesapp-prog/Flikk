// Fixed-height placeholder shown in a Home section's slot while that section's
// own query is still loading — so the page keeps a stable layout and sections
// paint in as their data arrives, instead of the whole body being gated behind
// the slowest query (AllTabSections.tsx's old global inventory gate). A plain
// lime-soft (#EEF7DC brand token) block with a gentle opacity shimmer; no new
// dependency — reanimated is already used throughout this app.

import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

export function SectionSkeleton({ height = 160 }: { height?: number }) {
  const opacity = useSharedValue(0.45);
  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.85, { duration: 800, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View className="px-5 pt-8" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={[{ height, borderRadius: 20, backgroundColor: '#EEF7DC' }, style]} />
    </View>
  );
}

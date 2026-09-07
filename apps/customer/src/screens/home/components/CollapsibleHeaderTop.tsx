// Shrinks to nothing (height + opacity) as the page scrolls — the
// location row (including DeliveryModeSwitcher + profile, folded in here
// instead of a separate always-visible element) hides, and the header's
// overall height reduces with it. Tagline text removed — the search bar
// (HomeHeader.tsx, rendered directly below this) is the only thing meant
// to sit below the header now.
//
// overflow: hidden is required — without it the fading text would still
// occupy layout space at height 0's midpoint and visibly clip weirdly.

import { View } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { EtaBadge } from './EtaBadge';
import { DeliveryModeSwitcher } from './DeliveryModeSwitcher';
import { LocationSelector } from './LocationSelector';

const PLACEHOLDER_ETA_MINUTES = 9; // real value should come from the nearest store's avg_prep_minutes
export const COLLAPSE_DISTANCE = 50; // px of scroll over which the block fully collapses
const MAX_HEIGHT = 44; // measured-by-eye: just the icon row now that the tagline is gone

interface Props {
  scrollY: SharedValue<number>;
  onChangeLocation: () => void;
  isClosed?: boolean;
}

export function CollapsibleHeaderTop({ scrollY, onChangeLocation, isClosed = false }: Props) {
  const animatedStyle = useAnimatedStyle(() => {
    const progress = interpolate(scrollY.value, [0, COLLAPSE_DISTANCE], [0, 1], Extrapolation.CLAMP);
    return {
      height: (1 - progress) * MAX_HEIGHT,
      opacity: 1 - progress,
    };
  });

  return (
    <Animated.View style={animatedStyle} className="gap-1 overflow-hidden">
      {/* <EtaBadge minutes={PLACEHOLDER_ETA_MINUTES} /> */}
      <View className="flex-row items-center justify-between">
        <LocationSelector onPress={onChangeLocation} isClosed={isClosed} />
        <DeliveryModeSwitcher />
      </View>
    </Animated.View>
  );
}

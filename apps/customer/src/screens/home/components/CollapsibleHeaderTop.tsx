// Shrinks to nothing (height + opacity) as the page scrolls — the
// ETA/location/tagline text hides and the header's overall height reduces
// with it. The avatar collapses too, on the same timing — see
// CollapsibleAvatar.tsx.
//
// overflow: hidden is required — without it the fading text would still
// occupy layout space at height 0's midpoint and visibly clip weirdly.

import Animated, { Extrapolation, interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { EtaBadge } from './EtaBadge';
import { HeaderTagline } from './HeaderTagline';
import { LocationSelector } from './LocationSelector';

const PLACEHOLDER_ETA_MINUTES = 9; // real value should come from the nearest store's avg_prep_minutes
// Exported so CollapsibleAvatar.tsx collapses on the same timing — both
// should finish hiding together, not at different scroll offsets.
export const COLLAPSE_DISTANCE = 50; // px of scroll over which the block fully collapses
const MAX_HEIGHT = 128; // measured-by-eye: ETA + location + the two-line headline tagline

interface Props {
  scrollY: SharedValue<number>;
  onChangeLocation: () => void;
}

export function CollapsibleHeaderTop({ scrollY, onChangeLocation }: Props) {
  const animatedStyle = useAnimatedStyle(() => {
    const progress = interpolate(scrollY.value, [0, COLLAPSE_DISTANCE], [0, 1], Extrapolation.CLAMP);
    return {
      height: (1 - progress) * MAX_HEIGHT,
      opacity: 1 - progress,
    };
  });

  return (
    <Animated.View style={animatedStyle} className="gap-1 overflow-hidden">
      <EtaBadge minutes={PLACEHOLDER_ETA_MINUTES} />
      <LocationSelector onPress={onChangeLocation} />
      <HeaderTagline />
    </Animated.View>
  );
}

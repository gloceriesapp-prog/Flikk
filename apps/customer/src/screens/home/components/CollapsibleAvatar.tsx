// Fades and shrinks the profile avatar on scroll, same timing as
// CollapsibleHeaderTop so both finish hiding together.

import Animated, { Extrapolation, interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { ProfileAvatarButton } from './ProfileAvatarButton';
import { COLLAPSE_DISTANCE } from './CollapsibleHeaderTop';

const MAX_HEIGHT = 44; // matches ProfileAvatarButton's h-11

interface Props {
  scrollY: SharedValue<number>;
}

export function CollapsibleAvatar({ scrollY }: Props) {
  const animatedStyle = useAnimatedStyle(() => {
    const progress = interpolate(scrollY.value, [0, COLLAPSE_DISTANCE], [0, 1], Extrapolation.CLAMP);
    return {
      height: (1 - progress) * MAX_HEIGHT,
      opacity: 1 - progress,
    };
  });

  return (
    <Animated.View style={animatedStyle} className="overflow-hidden">
      <ProfileAvatarButton />
    </Animated.View>
  );
}

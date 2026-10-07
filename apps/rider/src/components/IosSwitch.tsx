// Real iOS-style switch — ported from the Uiverse.io (zanina-yassine)
// CSS reference: 51x31 track, 27x27 white knob with the same drop shadow,
// #e9e9eb track off / #34C759 track on, knob sliding between the two
// positions the CSS's `left: calc(50% - 27px/2 ± 10px)` describes. Animated
// (not an instant jump) via RN's built-in Animated API — no new dependency
// for a two-value slide + color crossfade.

import { useEffect, useState } from 'react';
import { Animated, Pressable } from 'react-native';

const TRACK_WIDTH = 51;
const TRACK_HEIGHT = 31;
const KNOB_SIZE = 27;
const KNOB_INSET = (TRACK_HEIGHT - KNOB_SIZE) / 2;
const TRACK_OFF = '#e9e9eb';
const TRACK_ON = '#34C759';

interface Props {
  value: boolean;
  onValueChange: (value: boolean) => void;
}

export function IosSwitch({ value, onValueChange }: Props) {
  // Created once; held in state (not a ref) so render never reads ref.current.
  const [progress] = useState(() => new Animated.Value(value ? 1 : 0));

  useEffect(() => {
    Animated.timing(progress, { toValue: value ? 1 : 0, duration: 200, useNativeDriver: false }).start();
  }, [value, progress]);

  const trackColor = progress.interpolate({ inputRange: [0, 1], outputRange: [TRACK_OFF, TRACK_ON] });
  const knobTranslateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [KNOB_INSET, TRACK_WIDTH - KNOB_SIZE - KNOB_INSET],
  });

  return (
    <Pressable onPress={() => onValueChange(!value)} hitSlop={8}>
      <Animated.View
        style={{
          width: TRACK_WIDTH,
          height: TRACK_HEIGHT,
          borderRadius: TRACK_HEIGHT / 2,
          backgroundColor: trackColor,
          justifyContent: 'center',
        }}
      >
        <Animated.View
          style={{
            width: KNOB_SIZE,
            height: KNOB_SIZE,
            borderRadius: KNOB_SIZE / 2,
            backgroundColor: '#FFFFFF',
            transform: [{ translateX: knobTranslateX }],
            shadowColor: '#000',
            shadowOpacity: 0.15,
            shadowRadius: 3,
            shadowOffset: { width: 0, height: 3 },
            elevation: 3,
          }}
        />
      </Animated.View>
    </Pressable>
  );
}

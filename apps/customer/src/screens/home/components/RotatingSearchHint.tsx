// Rolling placeholder — cycles through real search terms with a vertical
// slide, like a mechanical flip/odometer display, instead of a static
// "Search for groceries, medicines..." string. Only rendered by
// HomeSearchBar while the input is empty; typing replaces it entirely.
//
// The list loops by duplicating its first item at the end — animating into
// that duplicate, then silently snapping translateY back to 0, gives a
// seamless loop instead of a jarring reverse-slide back to the start.

import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const SEARCH_HINTS = [
  'rice',
  'milk',
  'fresh fish',
  'cooking oil',
  'onions',
  'bread',
  'curd',
  'biscuits',
  'eggs',
  'tea powder',
];
const LOOP_HINTS = [...SEARCH_HINTS, SEARCH_HINTS[0]];

const ITEM_HEIGHT = 20;
const ROTATE_INTERVAL_MS = 1800;
const SLIDE_DURATION_MS = 450;

export function RotatingSearchHint() {
  const translateY = useSharedValue(0);

  useEffect(() => {
    let index = 0;
    const id = setInterval(() => {
      index += 1;
      const isLoopStep = index >= LOOP_HINTS.length - 1;
      translateY.value = withTiming(
        -index * ITEM_HEIGHT,
        { duration: SLIDE_DURATION_MS, easing: Easing.out(Easing.cubic) },
        (finished) => {
          'worklet';
          if (finished && isLoopStep) translateY.value = 0;
        },
      );
      if (isLoopStep) index = 0;
    }, ROTATE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <View style={{ height: ITEM_HEIGHT, overflow: 'hidden' }}>
      <Animated.View style={animatedStyle}>
        {LOOP_HINTS.map((hint, i) => (
          <Text
            key={`${hint}-${i}`}
            style={{ height: ITEM_HEIGHT, lineHeight: ITEM_HEIGHT }}
            className="text-base text-ink/45"
            numberOfLines={1}
          >
            Search &quot;{hint}&quot;
          </Text>
        ))}
      </Animated.View>
    </View>
  );
}

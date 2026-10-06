// Search stays still while product names roll through a clipped viewport.
// Pause off-screen/in the background and respect reduced-motion settings.
import { useEffect } from 'react';
import { AppState, Text, View, useWindowDimensions } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const SEARCH_HINTS = ['rice', 'milk', 'fresh fish', 'cooking oil', 'onions', 'bread', 'curd', 'biscuits', 'eggs', 'tea powder'];
const LOOP_HINTS = [...SEARCH_HINTS, SEARCH_HINTS[0]];
const LINE_HEIGHT = 24;
const ROTATE_INTERVAL_MS = 2600;
const SLIDE_DURATION_MS = 420;

export function RotatingSearchHint() {
  const translateY = useSharedValue(0);
  const isFocused = useIsFocused();
  const reduceMotion = useReducedMotion();
  const { fontScale } = useWindowDimensions();
  const itemHeight = Math.ceil(LINE_HEIGHT * fontScale);

  useEffect(() => {
    translateY.value = 0;
    if (!isFocused || reduceMotion) return;
    let index = 0;
    let timer: ReturnType<typeof setInterval> | undefined;
    const stop = () => {
      clearInterval(timer);
      timer = undefined;
      cancelAnimation(translateY);
      translateY.value = -index * itemHeight;
    };
    const start = () => {
      if (timer !== undefined) return;
      timer = setInterval(() => {
        index += 1;
        const isLoopStep = index === SEARCH_HINTS.length;
        translateY.value = withTiming(
          -index * itemHeight,
          { duration: SLIDE_DURATION_MS, easing: Easing.out(Easing.cubic) },
          (finished) => {
            'worklet';
            if (finished && isLoopStep) translateY.value = 0;
          },
        );
        if (isLoopStep) index = 0;
      }, ROTATE_INTERVAL_MS);
    };
    if (AppState.currentState === 'active') start();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') start();
      else stop();
    });
    return () => {
      stop();
      subscription.remove();
    };
  }, [isFocused, reduceMotion, itemHeight, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <View
      className="flex-row items-center gap-1.5"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Text className="text-base font-medium text-ink/55" style={{ lineHeight: LINE_HEIGHT, includeFontPadding: false }}>Search</Text>
      <View className="flex-1" style={{ height: itemHeight, overflow: 'hidden' }}>
        <Animated.View style={animatedStyle}>
          {LOOP_HINTS.map((hint, index) => (
            <Text
              key={`${hint}-${index}`}
              style={{ height: itemHeight, lineHeight: LINE_HEIGHT, includeFontPadding: false }}
              className="text-base font-semibold text-ink/75"
              numberOfLines={1}
            >
              &quot;{hint}&quot;
            </Text>
          ))}
        </Animated.View>
      </View>
    </View>
  );
}

// A decorative overlay for the real order-search input. Mount only while
// empty and unfocused so focusing or typing also cleans up the animation.
import { useEffect, useState } from 'react';
import { AccessibilityInfo, AppState, Text, View, useWindowDimensions } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../../../theme/tokens';

const SEARCH_HINTS = ['Search your grocery orders', 'Search by item or shop'];
const LOOP_HINTS = [...SEARCH_HINTS, SEARCH_HINTS[0]];
const LINE_HEIGHT = 24;

export function PurchaseSearchHint() {
  const translateY = useSharedValue(0);
  const isScreenFocused = useIsFocused();
  const initialReduceMotion = useReducedMotion();
  const [reduceMotion, setReduceMotion] = useState(initialReduceMotion);
  const { fontScale } = useWindowDimensions();
  const itemHeight = Math.ceil(LINE_HEIGHT * fontScale);

  useEffect(() => {
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    translateY.value = 0;
    if (!isScreenFocused || reduceMotion) return;

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
          { duration: 420, easing: Easing.out(Easing.cubic) },
          (finished) => {
            'worklet';
            if (finished && isLoopStep) translateY.value = 0;
          },
        );
        if (isLoopStep) index = 0;
      }, 2600);
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
  }, [isScreenFocused, reduceMotion, itemHeight, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, justifyContent: 'center' }}
    >
      <View style={{ height: itemHeight, overflow: 'hidden' }}>
        <Animated.View style={animatedStyle}>
          {LOOP_HINTS.map((hint, index) => (
            <Text
              key={`${hint}-${index}`}
              numberOfLines={1}
              ellipsizeMode="tail"
              style={{ height: itemHeight, lineHeight: LINE_HEIGHT, includeFontPadding: false, fontSize: 15, color: `${colors.ink}66` }}
            >
              {hint}
            </Text>
          ))}
        </Animated.View>
      </View>
    </View>
  );
}

import { memo, useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { Add01Icon, MinusSignIcon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../../components/AppIcon';
import { CART_CONTROL_DURATION } from './image-area/notchedCardGeometry';

interface Props {
  name: string;
  quantity: number;
  chooseOptions: boolean;
  compact: boolean;
  diameter?: number;
  pillWidth?: number;
  animatedWidth?: SharedValue<number>;
  onAdd: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
}

// The image notch and blue control share one width animation.
export const ProductCardCartControl = memo(function ProductCardCartControl({ name, quantity, chooseOptions, compact, diameter: suppliedDiameter, pillWidth: suppliedPillWidth, animatedWidth: sharedWidth, onAdd, onIncrement, onDecrement }: Props) {
  const expanded = quantity > 0 && !chooseOptions;
  const diameter = suppliedDiameter ?? (compact ? 40 : 44);
  const pillWidth = suppliedPillWidth ?? (compact ? 88 : 96);
  const localWidth = useSharedValue(expanded ? pillWidth : diameter);
  const animatedWidth = sharedWidth ?? localWidth;
  const padding = Math.max(0, 44 - diameter);
  useEffect(() => {
    if (!sharedWidth) localWidth.value = withTiming(expanded ? pillWidth : diameter, { duration: CART_CONTROL_DURATION, reduceMotion: ReduceMotion.System });
  }, [expanded, diameter, pillWidth, localWidth, sharedWidth]);
  const animatedStyle = useAnimatedStyle(() => ({ width: animatedWidth.value + padding }));

  return <Animated.View style={[{ height: Math.max(44, diameter) }, animatedStyle]}>
    <View pointerEvents="none" style={{ position: 'absolute', top: padding / 2, bottom: padding / 2, left: padding / 2, right: padding / 2, borderRadius: diameter / 2, backgroundColor: '#155DFC' }} />
    {expanded ? <View className="h-full flex-row items-center" style={{ paddingHorizontal: padding / 2 + 3 }}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Decrease quantity of ${name}`}
        onPress={event => { event.stopPropagation(); onDecrement(); }}
        className="h-full flex-1 items-center justify-center" style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}>
        <AppIcon icon={MinusSignIcon} size={Math.min(20, diameter * 0.4)} color="#FFFFFF" strokeWidth={2} />
      </Pressable>
      <Text accessibilityLiveRegion="polite" className="min-w-[16px] text-center text-[13px] font-semibold text-white">{quantity}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`Increase quantity of ${name}`}
        onPress={event => { event.stopPropagation(); onIncrement(); }}
        className="h-full flex-1 items-center justify-center" style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}>
        <AppIcon icon={Add01Icon} size={Math.min(20, diameter * 0.4)} color="#FFFFFF" strokeWidth={2} />
      </Pressable>
    </View> : <Pressable accessibilityRole="button" accessibilityLabel={`Add ${name} to cart`}
      onPress={event => { event.stopPropagation(); onAdd(); }} className="h-full w-full items-center justify-center"
      style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}>
      <AppIcon icon={Add01Icon} size={23} color="#FFFFFF" strokeWidth={1.8} />
    </Pressable>}
  </Animated.View>;
});

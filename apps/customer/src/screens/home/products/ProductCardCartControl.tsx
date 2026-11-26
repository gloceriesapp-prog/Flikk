import { memo, useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Add01Icon, MinusSignIcon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../../components/AppIcon';
import { actionColors } from '../../../theme/tokens';

interface Props {
  name: string;
  quantity: number;
  chooseOptions: boolean;
  compact: boolean;
  onAdd: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
}

// One anchored green control expands from a circle to a quantity pill.
// A white outline leaves a clean gap against product photos. Only cart
// state decides its shape; selecting a flavour/size never adds a default.
export const ProductCardCartControl = memo(function ProductCardCartControl({ name, quantity, chooseOptions, compact, onAdd, onIncrement, onDecrement }: Props) {
  const expanded = quantity > 0 && !chooseOptions;
  const diameter = compact ? 40 : 44;
  const pillWidth = compact ? 80 : 88;
  const animatedWidth = useSharedValue(expanded ? pillWidth : diameter);
  useEffect(() => {
    animatedWidth.value = withTiming(expanded ? pillWidth : diameter, { duration: 180, reduceMotion: ReduceMotion.System });
  }, [expanded, diameter, pillWidth, animatedWidth]);
  const animatedStyle = useAnimatedStyle(() => ({ width: animatedWidth.value }));

  return <Animated.View style={[{ height: diameter, borderRadius: diameter / 2, borderWidth: 2, borderColor: '#FFFFFF', backgroundColor: actionColors.fill, overflow: 'hidden' }, animatedStyle]}>
    {expanded ? <View className="h-full flex-row items-center">
      <Pressable accessibilityRole="button" accessibilityLabel={`Decrease quantity of ${name}`}
        onPress={event => { event.stopPropagation(); onDecrement(); }}
        className="h-full flex-1 items-center justify-center" style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}>
        <AppIcon icon={MinusSignIcon} size={18} color="#FFFFFF" strokeWidth={2} />
      </Pressable>
      <Text accessibilityLiveRegion="polite" className="min-w-[16px] text-center text-[13px] font-semibold text-white">{quantity}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`Increase quantity of ${name}`}
        onPress={event => { event.stopPropagation(); onIncrement(); }}
        className="h-full flex-1 items-center justify-center" style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}>
        <AppIcon icon={Add01Icon} size={18} color="#FFFFFF" strokeWidth={2} />
      </Pressable>
    </View> : <Pressable accessibilityRole="button" accessibilityLabel={`Add ${name} to cart`}
      onPress={event => { event.stopPropagation(); onAdd(); }} className="h-full w-full items-center justify-center"
      style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}>
      <AppIcon icon={Add01Icon} size={23} color="#FFFFFF" strokeWidth={1.8} />
    </Pressable>}
  </Animated.View>;
});

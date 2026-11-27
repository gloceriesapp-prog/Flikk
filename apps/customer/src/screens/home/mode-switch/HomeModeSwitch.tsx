// Home's two modes share the animated header tint. A single SVG outline
// joins each selected tab to the header without seams between corner pieces.
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, { Easing, Extrapolation, interpolate, interpolateColor, ReduceMotion, useAnimatedProps, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { COLLAPSE_DISTANCE } from '../components/CollapsibleHeaderTop';
import { HOME_MODES, useHomeModeStore } from './useHomeModeStore';
import { useHeaderTint } from '../header-theme/homeHeaderTheme';

const TAB_HEIGHT = 46;
const CORNER = 14;
const AnimatedPath = Animated.createAnimatedComponent(Path);

function ModeTab({ label, active, onPress, tint }: {
  label: string; active: boolean; onPress: () => void; tint: SharedValue<string>;
}) {
  const [width, setWidth] = useState(0);
  const selected = useSharedValue(active ? 1 : 0);
  useEffect(() => {
    selected.value = withTiming(active ? 1 : 0, {
      duration: 220, easing: Easing.inOut(Easing.cubic), reduceMotion: ReduceMotion.System,
    });
  }, [active, selected]);
  const activeStyle = useAnimatedStyle(() => ({ opacity: selected.value }));
  const inactiveStyle = useAnimatedStyle(() => ({ opacity: 1 - selected.value }));
  const labelStyle = useAnimatedStyle(() => ({ color: interpolateColor(selected.value, [0, 1], ['#FFFFFFD9', '#FFFFFF']) }));
  const fillProps = useAnimatedProps(() => ({ fill: tint.value }));
  // Tangent cubic corners keep the 18px crown and 14px concave foot smooth.
  const path = `M${-CORNER} ${TAB_HEIGHT}C-6.268 46 0 39.732 0 32V18C0 8.059 8.059 0 18 0H${width - 18}C${width - 8.059} 0 ${width} 8.059 ${width} 18V32C${width} 39.732 ${width + 6.268} 46 ${width + CORNER} 46Z`;
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} accessibilityLabel={label}
      onPress={() => { if (!active) onPress(); }} style={{ flex: 1, height: TAB_HEIGHT }}
      onLayout={event => {
        const next = event.nativeEvent?.layout?.width;
        if (next != null && Number.isFinite(next) && next > 0) setWidth(previous => Math.abs(previous - next) < 0.5 ? previous : next);
      }}>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 0, bottom: 0, left: -CORNER, right: -CORNER }, activeStyle]}>
        {width > 0 && <Svg width={width + CORNER * 2} height={TAB_HEIGHT} viewBox={`${-CORNER} 0 ${width + CORNER * 2} ${TAB_HEIGHT}`} accessible={false}>
          <AnimatedPath d={path} animatedProps={fillProps} />
        </Svg>}
      </Animated.View>
      <Animated.View pointerEvents="none" className="absolute inset-0 rounded-[18px] bg-white/15" style={inactiveStyle} />
      <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" className="absolute inset-0 items-center justify-center">
        <Animated.Text className="text-[19px] font-bold" style={[{ letterSpacing: -0.4 }, labelStyle]}>{label}</Animated.Text>
      </View>
    </Pressable>
  );
}

// Folds with the location row; the switch never leaves a separate divider.
export function HomeModeSwitch({ scrollY }: { scrollY: SharedValue<number> }) {
  const mode = useHomeModeStore((state) => state.mode);
  const setMode = useHomeModeStore((state) => state.setMode);
  const tint = useHeaderTint();
  const deep = useHeaderTint(true);
  const [rowHeight, setRowHeight] = useState(TAB_HEIGHT + 4);
  const stripStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(scrollY.value, [0, COLLAPSE_DISTANCE], [deep.value, tint.value]),
  }));
  const foldStyle = useAnimatedStyle(() => {
    const progress = interpolate(scrollY.value, [0, COLLAPSE_DISTANCE], [0, 1], Extrapolation.CLAMP);
    return { height: (1 - progress) * rowHeight, opacity: 1 - progress };
  });
  return (
    <Animated.View className="pt-safe" style={stripStyle}>
      <Animated.View className="overflow-hidden" style={foldStyle}>
        <View accessibilityRole="tablist" className="flex-row gap-3 px-4 pt-1" onLayout={event => {
          const measured = event.nativeEvent?.layout?.height;
          if (measured == null || !Number.isFinite(measured) || measured <= 0) return;
          const height = Math.ceil(measured);
          setRowHeight(previous => previous === height ? previous : height);
        }}>
          {HOME_MODES.map(item => (
            <ModeTab key={item.id} label={item.label} active={mode === item.id} onPress={() => setMode(item.id)} tint={tint} />
          ))}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

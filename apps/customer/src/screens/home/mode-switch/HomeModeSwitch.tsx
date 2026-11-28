// Two-tab switch at the very top of Home. The selected tab is the header's
// own colour (header-theme/) and runs straight into it through curved inner
// corners, so it reads as the header's tab; the other sits back as a frosted
// pill with a spaced-out wordmark. Both follow the header colour as it eases.
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { Extrapolation, interpolate, interpolateColor, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { COLLAPSE_DISTANCE } from '../components/CollapsibleHeaderTop';
import { HOME_MODES, useHomeModeStore, type HomeMode } from './useHomeModeStore';
import { useHeaderTint } from '../header-theme/homeHeaderTheme';

const TAB_HEIGHT = 46;
const CORNER = 14;

// Concave fillet joining the selected tab's foot to the header.
function Fillet({ side, tabStyle, stripStyle }: { side: 'left' | 'right'; tabStyle: object; stripStyle: object }) {
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', bottom: 0, [side]: -CORNER, width: CORNER, height: CORNER }, tabStyle]}>
      <Animated.View style={[{ flex: 1, [side === 'left' ? 'borderBottomRightRadius' : 'borderBottomLeftRadius']: CORNER }, stripStyle]} />
    </Animated.View>
  );
}

function ModeTab({ label, active, onPress, tabStyle, stripStyle }: {
  id: HomeMode; label: string; active: boolean; onPress: () => void; tabStyle: object; stripStyle: object;
}) {
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} accessibilityLabel={label} onPress={onPress}
      className={`flex-1 justify-end ${active ? '' : 'active:opacity-70'}`} style={{ height: TAB_HEIGHT }}>
      {active ? (
        <Animated.View className="flex-1 items-center justify-center" style={[{ borderTopLeftRadius: 18, borderTopRightRadius: 18 }, tabStyle]}>
          <Fillet side="left" tabStyle={tabStyle} stripStyle={stripStyle} />
          <Fillet side="right" tabStyle={tabStyle} stripStyle={stripStyle} />
          <Text className="text-[19px] font-black text-white" style={{ letterSpacing: -0.4 }}>{label}</Text>
        </Animated.View>
      ) : (
        <View className="mb-1.5 h-[36px] items-center justify-center rounded-[12px] border border-white/20 bg-white/15">
          <Text className="text-[13px] font-extrabold uppercase text-white/85" style={{ letterSpacing: 2.6 }}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

// Folds away with the location row on scroll (same COLLAPSE_DISTANCE); the
// status-bar strip turns header colour as it goes, so no dark band is left.
export function HomeModeSwitch({ scrollY }: { scrollY: SharedValue<number> }) {
  const mode = useHomeModeStore((state) => state.mode);
  const setMode = useHomeModeStore((state) => state.setMode);
  const tint = useHeaderTint();
  const deep = useHeaderTint(true);
  const [rowHeight, setRowHeight] = useState(TAB_HEIGHT + 4);
  const tabStyle = useAnimatedStyle(() => ({ backgroundColor: tint.value }));
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
        <View accessibilityRole="tablist" className="flex-row gap-3 px-4 pt-1" onLayout={(event) => {
          const height = Math.ceil(event.nativeEvent.layout.height);
          setRowHeight((previous) => previous === height ? previous : height);
        }}>
          {HOME_MODES.map((item) => (
            <ModeTab key={item.id} {...item} active={mode === item.id} onPress={() => setMode(item.id)} tabStyle={tabStyle} stripStyle={stripStyle} />
          ))}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

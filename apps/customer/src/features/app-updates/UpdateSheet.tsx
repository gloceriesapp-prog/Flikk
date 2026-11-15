import { ActivityIndicator, Pressable, Text, View } from 'react-native';

interface Action { label: string; onPress: () => void; busy?: boolean }
interface Props {
  title: string;
  message: string;
  /** 0..1 shows a progress bar; undefined hides it. */
  progress?: number;
  primary?: Action;
  secondary?: Action;
}

// One accent (the brand blue used by every primary button) on a neutral card.
const BLUE = '#155DFC';
// Same gap on the left, right and bottom edges. The radius follows the phone's
// rounded screen corners minus that gap, so the two curves run parallel.
const EDGE = 10;
const RADIUS = 40;

export function UpdateSheet({ title, message, progress, primary, secondary }: Props) {
  const percent = progress === undefined ? undefined : Math.round(Math.min(1, Math.max(0, progress)) * 100);
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 100, paddingHorizontal: EDGE, paddingBottom: EDGE }}>
      <View accessibilityLiveRegion="polite"
        style={{
          backgroundColor: '#FFFFFF', borderRadius: RADIUS, paddingHorizontal: 24, paddingTop: 28, paddingBottom: 24,
          borderWidth: 1, borderColor: '#E9EAEC',
          shadowColor: '#000000', shadowOpacity: 0.1, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 12,
        }}>
        <View className="flex-row items-baseline justify-between gap-4">
          <Text accessibilityRole="header" className="flex-1 text-[22px] font-bold text-ink" style={{ lineHeight: 28 }}>{title}</Text>
          {percent !== undefined && <Text className="text-[15px] font-semibold text-ink/50">{percent}%</Text>}
        </View>
        <Text className="mt-2 text-[15px] leading-[22px] text-ink/60">{message}</Text>

        {percent !== undefined && (
          <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: percent }}
            className="mt-6 h-1.5 overflow-hidden rounded-full bg-[#EEF0F2]">
            <View className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: BLUE }} />
          </View>
        )}

        {(primary || secondary) && (
          <View className="mt-6 flex-row gap-3">
            {secondary && (
              <Pressable accessibilityRole="button" onPress={secondary.onPress}
                className="h-[52px] flex-1 items-center justify-center rounded-full bg-[#F2F3F5] active:opacity-70">
                <Text className="text-[16px] font-semibold text-ink">{secondary.label}</Text>
              </Pressable>
            )}
            {primary && (
              <Pressable accessibilityRole="button" accessibilityState={{ busy: !!primary.busy, disabled: !!primary.busy }}
                disabled={primary.busy} onPress={primary.onPress}
                className="h-[52px] flex-1 items-center justify-center rounded-full active:opacity-80" style={{ backgroundColor: BLUE }}>
                {primary.busy ? <ActivityIndicator color="#FFFFFF" /> : <Text className="text-[16px] font-semibold text-white">{primary.label}</Text>}
              </Pressable>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

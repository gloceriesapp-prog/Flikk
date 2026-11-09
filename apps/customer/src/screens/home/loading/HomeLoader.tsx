// Home's first-open loader (useHomeReady decides when it goes). Just one
// line of text on white, picked at random each time the app opens, fading in
// gently. No icon or animation beyond the fade.
import { View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';

export const HOME_LOADER_LINES = [
  'Something Wonderful Awaits, Tulunadu...',
  'Everything You Love, Just a Tap Away...',
  'Bringing Local Treasures Closer to Home...',
];

export function pickLoaderLine(random: () => number = Math.random): string {
  return HOME_LOADER_LINES[Math.floor(random() * HOME_LOADER_LINES.length) % HOME_LOADER_LINES.length]!;
}

// One line per app open: Home shows the loader twice (shop check, then
// content), and both must show the same words.
let lineForThisOpen: string | undefined;

export function HomeLoader() {
  const reduceMotion = useReducedMotion();
  lineForThisOpen ??= pickLoaderLine();
  const line = lineForThisOpen;

  return (
    <View accessibilityRole="progressbar" accessibilityLabel={line} className="flex-1 items-center justify-center bg-white px-8">
      <Animated.Text entering={reduceMotion ? undefined : FadeIn.duration(400)}
        className="text-center text-[20px] font-semibold leading-[28px] text-ink">
        {line}
      </Animated.Text>
    </View>
  );
}

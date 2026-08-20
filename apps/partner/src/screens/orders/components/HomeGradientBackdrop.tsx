// Single vertical gradient wash spanning StoreProfileHeader and
// TodayStatsCard together — deep blue at the bottom (behind the stat
// boxes), fading up to a lighter blue by the status bar, per an explicit
// ask for "more blue at the bottom, reduce going up." One continuous
// surface, not two separately-colored blocks — the stat boxes (white,
// bordered) float on top of it rather than sitting on a flat page
// background, which is what makes them read as cards instead of just
// bordered rows.

import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  children: ReactNode;
}

export function HomeGradientBackdrop({ children }: Props) {
  return (
    <View>
      {/* LinearGradient isn't one of NativeWind's auto-patched components —
          a className here is silently ignored, so positioning goes
          through style, same gotcha as everywhere else this app uses it. */}
      <LinearGradient
        colors={['#DCF1FA', '#87CEEB', '#3E9BD1']}
        locations={[0, 0.45, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
}

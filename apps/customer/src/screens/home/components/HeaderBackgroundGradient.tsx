// The ONE file that actually renders a background gradient layer for
// Home — HomeHeader.tsx (its own sticky gradient) and
// SpotlightHeaderBleed.tsx (the gradient that continues it down behind
// the spotlight cards) both render THIS component instead of each
// carrying their own separate <LinearGradient> block. Two separate
// hand-written gradient blocks is exactly how those two drifted out of
// sync before (a positioning bug in one, a sizing bug in the other, each
// needing its own fix) — one shared renderer means there is only ever one
// place that can get "how a background gradient layer is drawn" wrong.
//
// style={StyleSheet.absoluteFill}, never nativewind className, for the
// positioning — LinearGradient is a third-party native view, not a core
// RN primitive nativewind pre-registers for className->style interop, and
// absolute positioning applied via className can silently fail there
// (this exact failure mode already cost a background layer once).
//
// colors/locations are the caller's own real gradient spec (HomeHeader's
// 4-stop per-category palette vs. SpotlightHeaderBleed's 3-stop
// header-color -> card-tint -> white bridge) — genuinely different visual
// specs, so they stay props, not hardcoded here. `children` lets
// HomeHeader still layer HeaderRays on top of its own gradient.

import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  colors: readonly [string, string, ...string[]];
  locations?: readonly [number, number, ...number[]];
  children?: ReactNode;
}

export function HeaderBackgroundGradient({ colors, locations, children }: Props) {
  return (
    <LinearGradient colors={colors} locations={locations} style={StyleSheet.absoluteFill}>
      {children}
    </LinearGradient>
  );
}

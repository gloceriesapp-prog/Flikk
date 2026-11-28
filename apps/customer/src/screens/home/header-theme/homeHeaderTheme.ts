// Home's header colour follows what the customer is browsing: deep ink
// (HOME_HEADER_COLOR) for All, its own colour for each category tab and for Udupi. The colour runs
// from the top switch down through the search sheet and the category row,
// eases to the new colour on a switch, and fades the sticky parts to white
// over FADE_DISTANCE of scroll. HomeScreen sets it; the shell header reads it.
import { useEffect } from 'react';
import { create } from 'zustand';
import {
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

// Fixed header colours by Home mode. All are dark enough for the header's
// white text (4.5:1+, tested).
export const HEADER_COLORS = {
  all: '#0C1413', // deep ink
  udupi: '#852B27', // deep laterite red, Udupi's own stone
  preorder: '#0E7490',
} as const;
export const HOME_HEADER_COLOR = HEADER_COLORS.all;
export const FADE_DISTANCE = 120;
const SWITCH_MS = 320;

// Rich enough for the header's white text. Unknown tabs get FALLBACK_COLOR.
const TAB_COLORS: Record<string, string> = {
  grocery: '#0D9488',
  groceries: '#0D9488',
  fresh: '#16A34A',
  'non veg': '#DC2626',
  'meat & fish': '#DC2626',
  dairy: '#0284C7',
};
const FALLBACK_COLOR = '#4F46E5';

export function colorForTab(name: string) {
  return TAB_COLORS[name.trim().toLowerCase()] ?? FALLBACK_COLOR;
}

// The one rule for the header colour, by what Home is showing:
// Udupi mode > Pre-order > the picked category tab > All.
export function headerColorFor({ udupi, preorder, tabName }: { udupi: boolean; preorder: boolean; tabName?: string | null }) {
  if (udupi) return HEADER_COLORS.udupi;
  if (preorder) return HEADER_COLORS.preorder;
  return tabName ? colorForTab(tabName) : HEADER_COLORS.all;
}

// Same hue, darker: the status-bar strip above the switch.
export function deepen(hex: string, amount = 0.5) {
  const value = parseInt(hex.slice(1), 16);
  const channel = (shift: number) => Math.round(((value >> shift) & 255) * (1 - amount));
  return `#${[16, 8, 0].map((shift) => channel(shift).toString(16).padStart(2, '0')).join('')}`;
}

interface HeaderThemeState {
  // null: no tint (Home not showing), the header falls back to HOME_HEADER_COLOR.
  color: string | null;
  setColor: (color: string | null) => void;
}

export const useHomeHeaderThemeStore = create<HeaderThemeState>((set) => ({
  color: null,
  setColor: (color) => set({ color }),
}));

// The current colour as an animated value that eases to each new colour.
export function useHeaderTint(deep = false): SharedValue<string> {
  const base = useHomeHeaderThemeStore((state) => state.color) ?? HOME_HEADER_COLOR;
  const target = deep ? deepen(base) : base;
  const tint = useSharedValue(target);
  useEffect(() => { tint.value = withTiming(target, { duration: SWITCH_MS }); }, [target, tint]);
  return tint;
}

// 0 at rest (tinted), 1 once scrolled FADE_DISTANCE (white).
export function fadeProgress(y: number) {
  'worklet';
  return interpolate(y, [0, FADE_DISTANCE], [0, 1], Extrapolation.CLAMP);
}

// Tinted at rest, white once scrolled. `mix` lightens the tint towards white
// (0.88 gives the soft card colour of unpicked tabs).
export function useTintToWhite(scrollY: SharedValue<number>, tint: SharedValue<string>, mix = 0) {
  return useAnimatedStyle(() => {
    const rest = mix ? interpolateColor(mix, [0, 1], [tint.value, '#FFFFFF']) : tint.value;
    return { backgroundColor: interpolateColor(fadeProgress(scrollY.value), [0, 1], [rest, mix ? '#F1F3F6' : '#FFFFFF']) };
  });
}

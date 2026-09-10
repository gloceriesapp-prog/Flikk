// Same collapsing/sticky/blur shell as store-list/components/StoreHeader.tsx
// (BlurView base -> fading gradient -> crisp real content on top), reused
// here rather than copied into a second animation implementation. Content
// is now the SAME location row + quick-links pill as Home/Store's own
// header (LocationSelector + DeliveryModeSwitcher) instead of a "Purchase"
// title + back arrow — per an explicit ask, this is a bottom-tab screen
// (reached from BottomNavBar), so a back arrow never belonged here, same
// reasoning StoreHeader.tsx's own header note already gives.
//
// Palette is a dark bronze-to-gold sweep — CLAUDE.md's `gold` (#D9A441,
// "ratings, ETA highlight — sparingly only") used as the gradient's bright
// edge rather than a flat wash, so this still reads as premium instead of
// literally painting the header token-yellow; a dark base keeps white
// header text/icons legible the way a flat bright yellow wouldn't.
//
// This component is item 0 inside PurchaseScreen's own Animated.ScrollView
// with stickyHeaderIndices={[0]} — same mechanism StoreHeader/HomeHeader use.

import { useCallback, useState, type ReactNode } from 'react';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { DeliveryModeSwitcher } from '../../home/components/DeliveryModeSwitcher';
import { HeaderRays } from '../../home/components/HeaderRays';
import { LocationSelector } from '../../home/components/LocationSelector';
import { useIsOutsideOperatingHours } from '../../../utils/useOperatingHours';

// Deep plum/wine sweep — not yellow (dropped per an explicit ask), not
// StoreHeader's indigo either, so this stays a distinct identity per
// screen rather than a shared "dark header" color. Fades toward the
// screen's own #FCFCFB body at the last stop so the seam between header
// and content reads as one continuous surface, same reasoning as before,
// just a different base palette. Dark enough throughout that white header
// text/icons stay legible; HeaderRays' diagonal light overlay is what
// reads as "premium" over a plain flat fill.
const PURCHASE_HEADER_GRADIENT = {
  colors: ['#0D0512', '#2B0F2E', '#5C1B4E', '#8A2A63', '#E7E2DC'] as const,
  stops: [0, 0.36, 0.62, 0.85, 1] as const,
};

// Same 50px collapse window StoreHeader.tsx uses — keeps every dark sticky
// header in the app crossfading on the same timeline.
const COLLAPSE_DISTANCE = 50;

interface Props {
  onChangeLocation: () => void;
  searchBar?: ReactNode;
  scrollY: SharedValue<number>;
}

export function PurchaseHeader({ onChangeLocation, searchBar, scrollY }: Props) {
  const isClosed = useIsOutsideOperatingHours();
  const [rowHeight, setRowHeight] = useState(0);
  const onRowLayout = useCallback((event: { nativeEvent: { layout: { height: number } } }) => {
    setRowHeight((current) => current || event.nativeEvent.layout.height);
  }, []);

  const rowStyle = useAnimatedStyle(() => {
    const progress = interpolate(scrollY.value, [0, COLLAPSE_DISTANCE], [0, 1], Extrapolation.CLAMP);
    return {
      height: rowHeight ? (1 - progress) * rowHeight : undefined,
      opacity: 1 - progress,
      marginBottom: searchBar ? (1 - progress) * 14 : 0,
    };
  });

  const gradientStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, COLLAPSE_DISTANCE], [1, 0.12], Extrapolation.CLAMP),
  }));

  return (
    // No rounded bottom corners — this header is sticky/pinned
    // (stickyHeaderIndices in PurchaseScreen.tsx), and StoreHeader.tsx's own
    // header note already documents why: a rounded bottom edge on a bar
    // pinned flush to the top exposes whatever's scrolling behind it
    // through the corner cutouts. The soft plum-tinted shadow below plus
    // the gradient's own fade-to-body-bg last stop is what actually closes
    // the "hard cut into a different-colored page" seam instead.
    <View
      className="overflow-hidden"
      style={{ shadowColor: '#5C1B4E', shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 10 }}
    >
      <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />

      <Animated.View style={[StyleSheet.absoluteFill, gradientStyle]}>
        <LinearGradient colors={PURCHASE_HEADER_GRADIENT.colors} locations={PURCHASE_HEADER_GRADIENT.stops} style={StyleSheet.absoluteFill} />
        <HeaderRays />
      </Animated.View>

      <View className="px-6 pb-6 pt-safe-offset-3">
        <Animated.View onLayout={onRowLayout} style={[{ overflow: 'hidden' }, rowStyle]}>
          <View className="flex-row items-center justify-between">
            <LocationSelector onPress={onChangeLocation} isClosed={isClosed} />
            <DeliveryModeSwitcher />
          </View>
        </Animated.View>

        {/* Never collapses — only rendered once there's something to
            search (PurchaseScreen: hasAnyOrder). */}
        {searchBar}
      </View>
    </View>
  );
}

// Same shell as HomeHeader.tsx (location row + DeliveryModeSwitcher pill +
// search bar), not the old photo-banner-with-back-arrow header this used
// to be — this is a bottom-tab screen (BottomNavBar is now rendered on
// StoreListScreen itself, same as Home), not a pushed detail screen, so a
// back arrow never belonged here in the first place.
//
// Background is a distinct indigo/sapphire palette, deliberately not one
// of categoryHeaderGradients.ts's own tab colors (emerald/brown/teal/red/
// plum) — this screen needs its own identity, not to look like whichever
// Home tab happens to be selected.
//
// Scroll behavior, per an explicit ask (drag down: everything except the
// search bar hides, a blur shows through, search bar stays pinned at the
// top). Three layers, bottom to top, all driven by the same scrollY
// StoreListScreen.tsx already tracks for BottomNavBar's own hide/show:
// 1. BlurView, always there — invisible at rest (fully hidden behind the
//    opaque gradient above it), only becomes visible once the gradient
//    thins out.
// 2. The gradient + HeaderRays — opaque at scroll 0, fades toward
//    translucent over COLLAPSE_DISTANCE px, revealing the blur underneath
//    (which is itself blurring whatever's scrolling behind this sticky
//    header, same as a real iOS translucent nav bar).
// 3. The real content (location row + search bar) — drawn on top of
//    both, never faded or blurred itself. Only the location/
//    DeliveryModeSwitcher row inside it collapses (height + opacity to 0,
//    same shape CollapsibleHeaderTop.tsx already gives Home's own header)
//    — the search bar never does, per the explicit ask.
//
// This component is item 0 inside StoreListScreen's own ScrollView with
// stickyHeaderIndices={[0]} — same mechanism HomeHeader.tsx already uses
// to stay pinned while everything below it scrolls away.

import { useCallback, useState } from 'react';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { LocationSelector } from '../../home/components/LocationSelector';
import { DeliveryModeSwitcher } from '../../home/components/DeliveryModeSwitcher';
import { HomeSearchBar } from '../../home/components/HomeSearchBar';
import { HeaderRays } from '../../home/components/HeaderRays';
import { useIsOutsideOperatingHours } from '../../../utils/useOperatingHours';

const STORE_HEADER_GRADIENT = {
  colors: [
 '#69A9D4',
  '#8FC2E1',
  '#B4D8EB',
  '#D9EDF6',
  ] as const,
  stops: [0, 0.35, 0.68, 1] as const,
};

// Same 50px collapse window CollapsibleHeaderTop.tsx uses on Home — the
// location row and the blur/gradient crossfade both finish over this same
// distance so nothing looks like it's animating on its own timeline.
const COLLAPSE_DISTANCE = 50;

interface Props {
  onChangeLocation: () => void;
  onOpenSearch: () => void;
  scrollY: SharedValue<number>;
}

export function StoreHeader({ onChangeLocation, onOpenSearch, scrollY }: Props) {
  const isClosed = useIsOutsideOperatingHours();
  // Measured once on layout — the location row's real height, not a
  // guessed pixel constant that would drift the moment its content
  // (isClosed's own two-line copy, DeliveryModeSwitcher) changes.
  const [rowHeight, setRowHeight] = useState(0);
  const onRowLayout = useCallback((event: { nativeEvent: { layout: { height: number } } }) => {
    setRowHeight((current) => current || event.nativeEvent.layout.height);
  }, []);

  const rowStyle = useAnimatedStyle(() => {
    const progress = interpolate(scrollY.value, [0, COLLAPSE_DISTANCE], [0, 1], Extrapolation.CLAMP);
    return {
      height: rowHeight ? (1 - progress) * rowHeight : undefined,
      opacity: 1 - progress,
      marginBottom: (1 - progress) * 16,
    };
  });

  const gradientStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, COLLAPSE_DISTANCE], [1, 0.12], Extrapolation.CLAMP),
  }));

  return (
    // No rounded bottom corners — this header is sticky/pinned now
    // (stickyHeaderIndices in StoreListScreen.tsx), and a rounded bottom
    // edge on a bar pinned flush to the top of the screen just exposed
    // whatever's scrolling behind it through the corner cutouts instead
    // of reading as a deliberate shape.
    <View className="overflow-hidden">
      <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />

      <Animated.View style={[StyleSheet.absoluteFill, gradientStyle]}>
        <LinearGradient colors={STORE_HEADER_GRADIENT.colors} locations={STORE_HEADER_GRADIENT.stops} style={StyleSheet.absoluteFill} />
        {/* <HeaderRays /> */}
      </Animated.View>

      <View className="px-6 pb-5 pt-safe-offset-3">
        <Animated.View onLayout={onRowLayout} style={[{ overflow: 'hidden' }, rowStyle]}>
          <View className="flex-row items-center justify-between">
            <LocationSelector onPress={onChangeLocation} isClosed={isClosed} light />
            <DeliveryModeSwitcher light />
          </View>
        </Animated.View>

        {/* Never collapses — the one thing that stays visible while
            everything else in this header hides, per an explicit ask. */}
        <HomeSearchBar onPress={onOpenSearch} />
      </View>
    </View>
  );
}

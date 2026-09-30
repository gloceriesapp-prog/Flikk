// Shrinks to nothing (height + opacity) as the page scrolls — the
// location row (including DeliveryModeSwitcher + profile, folded in here
// instead of a separate always-visible element) hides, and the header's
// overall height reduces with it. Tagline text removed — the search bar
// (HomeHeader.tsx, rendered directly below this) is the only thing meant
// to sit below the header now.
//
// paddingTop also animates here (MAX_TOP_PADDING -> MIN_TOP_PADDING),
// not just height/opacity — per an explicit ask, the space above the
// search bar was still showing the full expanded gap even once this
// block had fully collapsed, because that gap used to live as a static
// pt-5 on HomeHeader.tsx's own wrapper View, a sibling that had no idea
// this block was collapsing. Owning the padding here, tied to the same
// scroll progress, is what actually closes that gap down to a small
// residual once scrolled, instead of a static class fighting an animated
// sibling.
//
// overflow: hidden is required — without it the fading text would still
// occupy layout space at height 0's midpoint and visibly clip weirdly.

import { View } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { EtaBadge } from './EtaBadge';
import { DeliveryModeSwitcher } from './DeliveryModeSwitcher';
import { LocationSelector } from './LocationSelector';

const PLACEHOLDER_ETA_MINUTES = 9; // real value should come from the nearest store's avg_prep_minutes
// px of scroll over which the block fully collapses — lowered from 50 per
// an explicit ask to get the search bar under the status bar sooner: this
// row's real content height (not spare padding, both already at floor
// above) is the last thing standing between them, so the fix is
// collapsing it away after a much smaller scroll instead of shrinking it
// and risking clipping the address text/icon pill it holds. HomeHeader.tsx
// shares this same constant for its own frosted/blurred transition, so
// that now kicks in just as quickly too — both were always meant to
// finish together.
export const COLLAPSE_DISTANCE = 16;
// 64, was 44 ("measured-by-eye: just the icon row now that the tagline is
// gone") — that 44 was already a tight fit for LocationSelector's real
// two-line content (a text-base "Delivering to" line + a text-lg bold
// address line, ~50px combined) even at zero padding; this height is
// applied together with overflow:hidden, so adding MAX_TOP_PADDING below
// ate directly into that same fixed budget and pushed it over the edge —
// the bottom of "Yenna Gudde" started visibly clipping (per a reference
// screenshot). 64 leaves real room for both lines plus the padding.
const MAX_HEIGHT = 64;
// MAX_TOP_PADDING was pushed all the way to 0 in an earlier round of
// "reduce it further" — with genuinely zero breathing room, the
// "Delivering to"/location text sat flush against the very top of its own
// row and visibly clipped (per a reference screenshot: "vering to"/"Gudde"
// instead of "Delivering to"/"Yenna Gudde"). A small 10px restores real
// legibility at rest. MIN_TOP_PADDING stays 0 — this row still collapses
// down to fully flush once scrolled past COLLAPSE_DISTANCE, same as before.
const MAX_TOP_PADDING = 10;
const MIN_TOP_PADDING = 0;

interface Props {
  scrollY: SharedValue<number>;
  onChangeLocation: () => void;
  isClosed?: boolean;
  // 'all' tab renders a light pastel header — flip location + switcher to
  // dark text/icons on it (HomeHeader.tsx's own note).
  light?: boolean;
}

export function CollapsibleHeaderTop({ scrollY, onChangeLocation, isClosed = false, light = false }: Props) {
  const animatedStyle = useAnimatedStyle(() => {
    const progress = interpolate(scrollY.value, [0, COLLAPSE_DISTANCE], [0, 1], Extrapolation.CLAMP);
    return {
      height: (1 - progress) * MAX_HEIGHT,
      opacity: 1 - progress,
      paddingTop: MAX_TOP_PADDING - progress * (MAX_TOP_PADDING - MIN_TOP_PADDING),
    };
  });

  return (
    <Animated.View style={animatedStyle} className="gap-1 overflow-hidden">
      {/* <EtaBadge minutes={PLACEHOLDER_ETA_MINUTES} /> */}
      <View className="flex-row items-center justify-between">
        <LocationSelector onPress={onChangeLocation} isClosed={isClosed} light={light} />
        <DeliveryModeSwitcher light={light} />
      </View>
    </Animated.View>
  );
}

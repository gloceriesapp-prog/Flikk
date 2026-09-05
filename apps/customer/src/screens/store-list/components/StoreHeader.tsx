// Header banner — full-bleed real shop photo (HEADER_ART) again, per an
// explicit ask, not the right-58%-width split from the previous pass.
// HEADER_GRADIENT stays underneath the photo (inset:0, same as the photo
// itself) purely as the color that shows through while the photo is
// still loading/if it ever fails — not a visible design element anymore
// on its own now that the photo covers the whole header.
//
// DARK_OVERLAY is what makes a full-bleed photo actually work as a header
// instead of just washing out the white back-button/headline text sitting
// on top of it — same subtle-but-necessary technique most premium photo
// headers use: a soft black gradient, stronger at the bottom-left (where
// the headline lives) than the top-right, rather than a flat uniform tint
// that would darken the whole photo evenly for no reason.

import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, Text, View } from 'react-native';
import { AppImage as Image } from '../../../components/AppImage';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';

const HEADER_GRADIENT = {
  colors: ['#030415', '#0A1140', '#1B2C8C', '#3547DA', '#5568FF'] as const,
  stops: [0, 0.28, 0.55, 0.8, 1] as const,
};

const DARK_OVERLAY = {
  colors: ['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.45)', 'rgba(0,0,0,0.72)'] as const,
  stops: [0, 0.55, 1] as const,
};

const HEADER_ART =
  'https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/Images/1788601744.png';

interface Props {
  onBack: () => void;
}

// No search icon on this header — StoreFilterBar directly below carries
// a filter/favourite pair instead (search was dropped from this screen
// entirely per an explicit ask).
export function StoreHeader({ onBack }: Props) {
  return (
    // Fixed size lives on this plain View, not on LinearGradient itself —
    // every child here is position:absolute (no intrinsic size), so if the
    // size were on LinearGradient's own className and that class ever
    // failed to apply, the gradient collapses to 0 height with nothing to
    // fall back on (exactly what happened once already). Same
    // wrapper-owns-size / gradient-fills-it split the old Image version
    // used, just swapped from Image to LinearGradient.
    <View className="h-60 w-full overflow-hidden rounded-b-[32px]">
      {/* style, not className — LinearGradient's className is silently
          ignored (same gotcha BottomNavBar.tsx/CartBar.tsx already
          document for BlurView), which is why this was invisible. */}
      <LinearGradient
        colors={HEADER_GRADIENT.colors}
        locations={HEADER_GRADIENT.stops}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      {/* Full width AND height now (inset:0), not the previous right-58%
          split — contentFit="cover" fills the whole box instead of
          letterboxing. pointerEvents="none" so it never intercepts the
          back-button/headline area's own touches. */}
      <Image
        source={{ uri: HEADER_ART }}
        contentFit="cover"
        pointerEvents="none"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      {/* See this file's own header note on why this exists — legibility
          for the white text/icons sitting on top of a now-full-bleed
          photo, stronger toward the bottom-left where the headline is. */}
      <LinearGradient
        colors={DARK_OVERLAY.colors}
        locations={DARK_OVERLAY.stops}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
        pointerEvents="none"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      <View className="absolute inset-x-5 top-0 pt-safe-offset-3">
        <Pressable onPress={onBack} hitSlop={12} className="h-11 w-11 items-center justify-center rounded-full bg-white">
          <AppIcon icon={ArrowLeft01Icon} size={20} color={colors.ink} />
        </Pressable>
      </View>

      {/* Eyebrow + tight single-word headline reads punchier/more premium
          than the old two-line wrapped sentence — a short capitalized
          label doing the "what is this" work instead of the headline
          itself having to spell it out. */}
      {/* <View className="absolute bottom-7 left-5 right-5">
        <Text className="mt-1 text-[29px] font-medium tracking-tight text-white">Nearby, Local stores.</Text>
      </View> */}
    </View>
  );
}

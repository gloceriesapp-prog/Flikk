// Header banner — swapped from a full-bleed stock illustration to a
// gradient. Own deep midnight-indigo palette (not Home's 'all' charcoal-
// aubergine) — per an explicit ask for a distinct, more premium color for
// this screen specifically rather than reusing Home's tone.

import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';

const HEADER_GRADIENT = {
  colors: ['#05070F', '#0E1530', '#16205A', '#2438A8'] as const,
  stops: [0, 0.35, 0.68, 1] as const,
};

interface Props {
  onBack: () => void;
}

// Search icon dropped — CategoryFilterBar directly below already has its
// own search pill, so this was a duplicate control on the same screen.
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
      <View className="absolute bottom-7 left-5 right-5">
        <Text className="mt-1 text-[29px] font-medium tracking-tight text-white">Nearby, Local stores.</Text>
      </View>
    </View>
  );
}

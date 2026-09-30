// Back arrow (own white circle, left) and the title, centered across the
// full row via an absolutely-positioned overlay (not flex-1 balancing,
// which drifts off-center whenever the row isn't symmetric) — a spacer
// view matching the arrow's own width sits on the right so the row stays
// balanced even with nothing else there.
//
// Owns its own pt-safe background (not the screen root), matching the
// same #F1F2F4 canvas CartScreen/CheckoutScreen both use — this header now
// reads as one continuous surface with the page below it, not a separate
// white band sitting on top. The back arrow is the one element that still
// needs to stand out against that flat gray, so it gets its own white
// circle instead of relying on a whole-header color contrast.

import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';

interface Props {
  onBack: () => void;
  itemCount: number;
  total: number;
}

export function CheckoutHeader({ onBack, itemCount, total }: Props) {
  return (
    <View className="bg-[#F2F2F7] px-3 pb-1 pt-safe-offset-2">
      <View className="relative flex-row items-center justify-between">
        <Pressable onPress={onBack} hitSlop={12} className="h-11 w-11 items-center justify-center rounded-full bg-white">
          <AppIcon icon={ArrowLeft01Icon} size={22} color={colors.ink} />
        </Pressable>

        <View className="h-11 w-11" />

        <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
          <Text className="text-[18px] font-semibold text-ink" numberOfLines={1}>
            Choose how to pay
          </Text>
        </View>
      </View>
    </View>
  );
}

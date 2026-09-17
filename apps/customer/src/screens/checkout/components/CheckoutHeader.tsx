// Back arrow stays put on the left; the title sits next to it instead of
// centered across the row, with a real "N item(s). Total: ₹X" subtitle
// underneath — a centered title alone had nothing to actually orient the
// customer on how big this order even is, right where they're about to
// commit to paying for it.
//
// Owns its own pt-safe background (not the screen root), matching the
// same #F1F2F4 canvas CartScreen/CheckoutScreen both use — this header now
// reads as one continuous surface with the page below it, not a separate
// white band sitting on top. The back arrow is the one element that still
// needs to stand out against that flat gray, so it gets its own small
// white circle behind it instead of relying on a whole-header color
// contrast.

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
    <View className="flex-row items-center gap-2 bg-[#F1F2F4] px-2 pb-1 pt-safe-offset-2">
      <Pressable onPress={onBack} hitSlop={12} className="h-11 w-11 items-center justify-center rounded-full bg-white">
        <AppIcon icon={ArrowLeft01Icon} size={22} color={colors.ink} />
      </Pressable>
      <View>
        <Text className="text-[18px] pl-1 font-medium text-ink">Select a Payment Option</Text>
        {/* <Text className="text-[13.5px] font-medium text-ink/50">
          {itemCount} {itemCount === 1 ? 'item' : 'items'}. Total: ₹{total}
        </Text> */}
      </View>
    </View>
  );
}

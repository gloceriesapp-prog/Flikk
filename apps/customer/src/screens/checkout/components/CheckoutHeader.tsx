// Back arrow stays put on the left; the title sits next to it instead of
// centered across the row, with a real "N item(s). Total: ₹X" subtitle
// underneath — a centered title alone had nothing to actually orient the
// customer on how big this order even is, right where they're about to
// commit to paying for it.
//
// Owns its own pt-safe + white background (not the screen root) — the
// page canvas below is off-white/gray (CheckoutScreen's own note on flat
// elevation-via-contrast), but the header band, including the status-bar
// area behind it, needs to read as a distinct solid-white surface, not
// gray bleeding all the way to the top of the phone.

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
    <View className="flex-row items-center gap-2 bg-white px-2 pb-3 pt-safe-offset-2">
      <Pressable onPress={onBack} hitSlop={12} className="h-11 w-11 items-center justify-center">
        <AppIcon icon={ArrowLeft01Icon} size={22} color={colors.ink} />
      </Pressable>
      <View>
        <Text className="text-[17px] font-medium text-ink">Choose how to pay</Text>
        <Text className="text-sm font-medium text-ink/50">
          {itemCount} {itemCount === 1 ? 'item' : 'items'}. Total: ₹{total}
        </Text>
      </View>
    </View>
  );
}

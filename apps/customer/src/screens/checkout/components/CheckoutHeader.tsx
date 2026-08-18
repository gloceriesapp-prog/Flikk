// Back arrow (not the reference's delete/trash icon — this isn't a
// destructive screen) + centered "Checkout" title (not "Your order") +
// search icon on the right, per an explicit ask departing from the
// reference image in exactly these three spots.

import { ArrowLeft01Icon, Search01Icon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';

interface Props {
  onBack: () => void;
  onSearch: () => void;
}

export function CheckoutHeader({ onBack, onSearch }: Props) {
  return (
    <View className="flex-row items-center px-2 pb-2 pt-2">
      <Pressable onPress={onBack} hitSlop={12} className="h-11 w-11 items-center justify-center">
        <AppIcon icon={ArrowLeft01Icon} size={22} color={colors.ink} />
      </Pressable>
      <Text className="flex-1 text-center text-xl font-extrabold text-ink">Checkout</Text>
      <Pressable onPress={onSearch} hitSlop={12} className="h-11 w-11 items-center justify-center">
        <AppIcon icon={Search01Icon} size={20} color={colors.ink} />
      </Pressable>
    </View>
  );
}

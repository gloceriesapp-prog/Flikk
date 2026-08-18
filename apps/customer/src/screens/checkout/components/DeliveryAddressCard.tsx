// Same rounded gray row pattern as the reference's "SURF COFFEE x BASE"
// card — shows the saved delivery address and taps through to
// LocationSearchScreen (the same screen the onboarding flow uses) to
// change it, rather than a separate address picker built just for this.

import { ArrowRight01Icon, Location01Icon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import { useLocationStore } from '../../../store/useLocationStore';

interface Props {
  onPress: () => void;
}

export function DeliveryAddressCard({ onPress }: Props) {
  const location = useLocationStore((s) => s.location);
  const address = location?.addressLabel ?? 'Add a delivery address';

  return (
    <Pressable onPress={onPress} className="flex-row items-center gap-3 rounded-2xl bg-gray-100 px-4 py-3.5">
      <View className="h-9 w-9 items-center justify-center rounded-full bg-white">
        <AppIcon icon={Location01Icon} size={17} color={colors.ink} />
      </View>
      <View className="flex-1">
        <Text className="text-base font-semibold text-ink/50">Delivering to</Text>
        <Text className="text-base font-semibold text-ink" numberOfLines={1}>
          {address}
        </Text>
      </View>
      <AppIcon icon={ArrowRight01Icon} size={18} color={colors.ink} />
    </Pressable>
  );
}

// Sits right below CheckoutHeader, above TotalAmountCard — same rounded
// white-card language as that component. Was entirely missing before:
// CheckoutScreen silently used the account's default saved address behind
// the scenes with no way to see or change it from this screen at all.
//
// "Change" reuses the exact same real map/pin/search flow the rest of the
// app already uses for setting a delivery location (LocationSearchScreen,
// intent: 'address-book') — the identical call AddressFormScreen.tsx's
// own onChangePin already makes, not a second, separate map
// implementation. That screen's own real GPS/reverse-geocode/patched
// react-native-maps setup is what makes the picked location accurate;
// duplicating any of that here would just be a second copy to keep in
// sync.

import { Pressable, Text, View } from 'react-native';
import { ArrowRight01Icon, Location01Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import type { ApiAddress } from '../../../api/addresses';

interface Props {
  address: ApiAddress | null;
  onChange: () => void;
}

export function DeliveryAddressCard({ address, onChange }: Props) {
  return (
    <Pressable onPress={onChange} className="flex-row items-center gap-3 rounded-2xl bg-white px-4 py-3.5">
      <View className="h-9 w-9 items-center justify-center rounded-full bg-blue-50">
        <AppIcon icon={Location01Icon} size={17} color="#155dfc" />
      </View>

      <View className="flex-1">
        <Text className="text-[13px] font-medium text-ink/45">Delivering to</Text>
        {address ? (
          <Text className="text-[14.5px] font-semibold text-ink" numberOfLines={1}>
            {address.label} · {address.line1}
          </Text>
        ) : (
          <Text className="text-[14.5px] font-semibold text-danger">Add a delivery address</Text>
        )}
      </View>

      <View className="flex-row items-center gap-1">
        <Text className="text-[13.5px] font-semibold text-[#155dfc]">Change</Text>
        <AppIcon icon={ArrowRight01Icon} size={14} color={colors.ink} />
      </View>
    </Pressable>
  );
}

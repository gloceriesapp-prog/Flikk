// Cart's bottom action bar — driven entirely by real address-book state
// (api/addresses.ts), not a guess:
//
// - Zero saved addresses: only "Add delivery address" shows — the button
//   itself becomes the fix instead of a separate dead-end "Checkout" that
//   would just fail downstream once real order creation needs a real
//   address_id.
// - One or more saved addresses: the last-used one (its own default,
//   AddressListScreen's own "first address becomes default" rule) shows
//   above the button, so returning with a saved address doesn't force a
//   tap-through every single cart visit — tapping that card is what opens
//   AddressSelectSheet to actually change it. The button itself is always
//   "Proceed to Pay" here, straight into Checkout with whichever address
//   is currently shown.

import { ChevronRightIcon, Location01Icon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import type { ApiAddress } from '../../../api/addresses';

const ACCENT = '#155DFC';

interface Props {
  addressesLoading: boolean;
  selectedAddress: ApiAddress | null;
  onAddAddress: () => void;
  onOpenAddressPicker: () => void;
  onProceedToPay: () => void;
}

export function CartCheckoutFooter({ addressesLoading, selectedAddress, onAddAddress, onOpenAddressPicker, onProceedToPay }: Props) {
  if (!addressesLoading && !selectedAddress) {
    return (
      <View className="border-t border-mist bg-white px-5 pb-safe-offset-4 pt-4">
        <Pressable
          onPress={onAddAddress}
          className="flex-row items-center justify-center gap-2 rounded-3xl py-4"
          style={{ backgroundColor: ACCENT }}
        >
          <AppIcon icon={Location01Icon} size={18} color="#FFFFFF" />
          <Text className="text-lg font-medium text-white">Add delivery address</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="gap-3 border-t border-mist bg-white px-5 pb-safe-offset-4 pt-4">
      {selectedAddress ? (
        <Pressable onPress={onOpenAddressPicker} className="flex-row items-center gap-3 rounded-2xl px-3.5 py-3" style={{ backgroundColor: `${ACCENT}0D` }}>
          <View className="h-9 w-9 items-center justify-center rounded-full bg-white">
            <AppIcon icon={Location01Icon} size={16} color={ACCENT} />
          </View>
          <View className="flex-1">
            <Text className="text-[14px] font-bold text-ink" numberOfLines={1}>
              {selectedAddress.label}
            </Text>
            <Text className="text-[12.5px] text-ink/50" numberOfLines={1}>
              {selectedAddress.line1}
            </Text>
          </View>
          <AppIcon icon={ChevronRightIcon} size={16} color={ACCENT} />
        </Pressable>
      ) : null}

      <Pressable
        onPress={onProceedToPay}
        disabled={addressesLoading}
        className="flex-row items-center justify-center gap-2 rounded-3xl py-4"
        style={{ backgroundColor: addressesLoading ? `${ACCENT}80` : ACCENT }}
      >
        <Text className="text-lg font-medium text-white">Proceed to Pay</Text>
      </Pressable>
    </View>
  );
}

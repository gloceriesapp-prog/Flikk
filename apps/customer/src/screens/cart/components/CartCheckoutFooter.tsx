// Cart's bottom action bar — driven entirely by real address-book state
// (api/addresses.ts), not a guess:
//
// - Zero saved addresses: only "Add delivery address" shows — the button
//   itself becomes the fix instead of a separate dead-end "Checkout" that
//   would just fail downstream once real order creation needs a real
//   address_id.
// - One or more saved addresses: just "Proceed to Pay", straight into
//   Checkout with whichever address is currently selected. The address
//   itself (and the "Change" affordance to reopen AddressSelectSheet) now
//   lives in CartDeliveryInfoBar's "Delivery Details" card up in the
//   scroll list — showing it again down here duplicated that card for no
//   reason.

import { Location01Icon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import type { ApiAddress } from '../../../api/addresses';

const ACCENT = '#155DFC';

interface Props {
  addressesLoading: boolean;
  selectedAddress: ApiAddress | null;
  onAddAddress: () => void;
  onProceedToPay: () => void;
}

export function CartCheckoutFooter({ addressesLoading, selectedAddress, onAddAddress, onProceedToPay }: Props) {
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
    <View className="border-t border-mist bg-white px-5 pb-safe-offset-4 pt-4">
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

// Cart's bottom action bar — driven entirely by real address-book state
// (api/addresses.ts), not a guess:
//
// - Zero saved addresses: only "Add delivery address" shows — the button
//   itself becomes the fix instead of a separate dead-end "Checkout" that
//   would just fail downstream once real order creation needs a real
//   address_id.
// - One or more saved addresses: a compact "Delivering to {label}" row
//   (icon + address + "Change") sits directly above "Proceed to Pay" —
//   per an explicit ask/reference image, so the address a customer's
//   about to pay against is the last thing they see before tapping pay,
//   not something they had to scroll back up for. CartDeliveryInfoBar's
//   own "Delivery Details" card up in the scroll list still exists
//   unchanged (that file's own note) — this is a second, deliberately
//   smaller readout in the footer itself, same accent color as the rest
//   of this app (not copying the reference image's own orange/green).

import { ChevronRightIcon, Location01Icon, Location03Icon, MapsLocation02Icon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import type { ApiAddress } from '../../../api/addresses';

const ACCENT = '#155DFC';

interface Props {
  addressesLoading: boolean;
  selectedAddress: ApiAddress | null;
  onAddAddress: () => void;
  onChangeAddress: () => void;
  onProceedToPay: () => void;
}

export function CartCheckoutFooter({ addressesLoading, selectedAddress, onAddAddress, onChangeAddress, onProceedToPay }: Props) {
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
      {selectedAddress && (
        <Pressable onPress={onChangeAddress} className="flex-row items-center gap-2.5">
          <View className="items-center justify-center">
            <AppIcon icon={Location03Icon} size={22} color={ACCENT} />
          </View>
          <View className="min-w-0 flex-1 gap-0.5">
            <Text numberOfLines={1} className="text-[14.5px] font-medium text-ink/90">
              Delivering to <Text className="font-semibold text-ink">{selectedAddress.label}</Text>
            </Text>
            <Text numberOfLines={1} className="text-[12.5px] font-medium text-ink/50">
              {selectedAddress.line1}
            </Text>
          </View>
          <View className="flex-row items-center gap-0.5">
            <Text className="text-[14px] font-semibold" style={{ color: ACCENT }}>
              Change
            </Text>
            <AppIcon icon={ChevronRightIcon} size={13} color={ACCENT} />
          </View>
        </Pressable>
      )}

      <Pressable
        onPress={onProceedToPay}
        disabled={addressesLoading}
        className="flex-row items-center justify-center gap-2 rounded-3xl py-4"
        style={{ backgroundColor: addressesLoading ? `${ACCENT}80` : ACCENT }}
      >
        <Text className="text-lg font-medium text-white">Choose how to pay</Text>
      </Pressable>
    </View>
  );
}

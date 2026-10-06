// Cart footer keeps delivery-address controls above payment and order actions.
import type { ReactNode } from 'react';
import { ChevronRightIcon, Location01Icon, Location03Icon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import type { ApiAddress } from '../../../api/addresses';

const ACCENT = '#155DFC';

interface Props {
  addressesLoading: boolean;
  selectedAddress: ApiAddress | null;
  onAddAddress: () => void;
  onChangeAddress: () => void;
  paymentBar: ReactNode;
}

export function CartCheckoutFooter({ addressesLoading, selectedAddress, onAddAddress, onChangeAddress, paymentBar }: Props) {
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
    <View className="border-t border-mist bg-white">
      {selectedAddress && (
        <Pressable onPress={onChangeAddress} className="flex-row items-center gap-2.5 px-4 pb-3 pt-3">
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

      {paymentBar}
    </View>
  );
}

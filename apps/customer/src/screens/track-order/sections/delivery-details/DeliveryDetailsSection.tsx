import { Text, View } from 'react-native';
import type { OrderDeliveryAddress } from '../../../../api/orders';
import { maskRecipientPhone } from './utils/maskRecipientPhone';

interface Props {
  address: OrderDeliveryAddress | null | undefined;
}

export function DeliveryDetailsSection({ address }: Props) {
  const phone = maskRecipientPhone(address?.recipient_phone);

  return (
    <View className="w-full rounded-3xl bg-white p-5">
      <Text accessibilityRole="header" className="text-[18px] font-bold text-ink">Your delivery details</Text>
      {address ? (
        <>
          {!!address.label && <Text className="mt-4 text-[13px] font-semibold text-ink/55">{address.label}</Text>}
          <Text className="mt-1 text-[15px] font-medium leading-[22px] text-ink">{address.line1}</Text>
          {!!address.landmark && <Text className="mt-1 text-[13px] leading-5 text-ink/55">{address.landmark}</Text>}
          <View className="mt-4 gap-1 border-t border-ink/5 pt-3">
            <Text className="text-[14px] font-semibold text-ink">{address.recipient_name || 'Recipient name unavailable'}</Text>
            <Text className="text-[13px] font-medium text-ink/55">{phone ?? 'Contact number unavailable'}</Text>
          </View>
        </>
      ) : (
        <Text className="mt-3 text-[14px] text-ink/55">Delivery details unavailable for this order.</Text>
      )}
    </View>
  );
}

import { Text, View } from 'react-native';
import type { OrderDeliveryAddress } from '../../../../api/orders';
import { GILROY } from '../../../../theme/fonts';
import { maskRecipientPhone } from './utils/maskRecipientPhone';

interface Props {
  address: OrderDeliveryAddress | null | undefined;
  // Track Order puts the title above the card; the order summary screen
  // keeps it inside, like its Bill details and Order details cards.
  titleInside?: boolean;
}

// Type scale follows the Bill details card: 15 px text, grey secondary lines.
export function DeliveryDetailsSection({ address, titleInside = false }: Props) {
  const phone = maskRecipientPhone(address?.recipient_phone);
  const hasMapAddress = !!address?.map_address && address.map_address !== address.line1;
  const landmark = address?.landmark
    ? <Text className="text-[14px] font-medium text-[#8A8D93]">{`, ${address.landmark}`}</Text> : null;
  const title = (
    <Text accessibilityRole="header" className={titleInside ? 'text-[16px] font-semibold text-ink' : 'mb-2.5 px-1 text-[16px] font-bold text-ink'}>
      Your delivery details
    </Text>
  );

  return (
    <View className={titleInside ? 'w-full' : 'mt-2 w-full'}>
      {!titleInside && title}
      <View className="w-full gap-4 rounded-3xl bg-white px-5 py-5">
        {titleInside && title}
        {address ? (
          <>
            <View className="gap-1">
              {!!address.label && <Text className="text-[14px] font-semibold text-[#737579]">{address.label}</Text>}
              <Text className="text-[15px] leading-[22px] text-[#505257]" style={{ fontFamily: GILROY.semibold }}>
                {address.line1}
                {/* No map location: the landmark follows the house line instead. */}
                {!hasMapAddress && landmark}
              </Text>
              {/* The pinned map location the order was delivered to, ending in
                  the pincode, with the landmark right after it in grey. */}
              {hasMapAddress && (
                <Text className="text-[14.5px] font-medium leading-[21px] text-[#505257]">
                  {address.map_address}
                  {landmark}
                </Text>
              )}
            </View>
            <View className="gap-1 border-t border-gray-100 pt-4">
              <Text className="text-[15px] text-ink" style={{ fontFamily: GILROY.semibold }}>{address.recipient_name || 'Recipient name unavailable'}</Text>
              <Text className="text-[14px] font-medium text-[#737579]">{phone ?? 'Contact number unavailable'}</Text>
            </View>
          </>
        ) : (
          <Text className="text-[15px] font-medium text-[#737579]">Delivery details unavailable for this order.</Text>
        )}
      </View>
    </View>
  );
}

import { ActivityIndicator, Platform, Pressable, Text, View } from 'react-native';
import { Call02Icon } from '@hugeicons/core-free-icons';
import type { ApiAddress } from '../../../api/addresses';
import type { DeliveryLocation } from '../../../store/useLocationStore';
import { mapAddressLabel } from '../../../features/delivery-address/mapAddress';
import { AppIcon } from '../../../components/AppIcon';
import { IconlyHome } from '../../../components/icons/iconly';

interface Props {
  loading: boolean;
  address: ApiAddress | null;
  location?: DeliveryLocation | null;
  onChange: () => void;
  onAdd: () => void;
}

// Keep the recipient details, but display the address resolved for this
// delivery pin rather than the separately typed rider directions.
export function CartDeliveryAddressCard({ loading, address, location, onChange, onAdd }: Props) {
  const name = address?.recipient_name.trim() || address?.label || 'Delivery address';
  const addressText = address ? mapAddressLabel(address, location) : '';
  const phone = address?.recipient_phone?.trim();

  return <View className="gap-2 rounded-3xl bg-white p-3.5">
    <Text accessibilityRole="header" className="font-bold tracking-tight text-ink/90" style={{ fontSize: Platform.OS === 'ios' ? 18 : 17 }}>Delivering to</Text>
    {loading ? <View className="flex-row items-center gap-2 rounded-2xl bg-[#F5F5F5] px-3 py-2.5">
      <ActivityIndicator size="small" color="#737579" />
      <Text className="text-[14px] text-ink/60">Loading delivery address…</Text>
    </View> : address ? <View className="gap-1.5 rounded-2xl bg-[#F5F5F5] px-3 py-2.5">
      <View className="flex-row items-center gap-2">
        <IconlyHome size={20} color="#333333" active />
        <Text className="min-w-0 flex-1 text-[16px] font-bold text-ink" numberOfLines={2}>{name}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Change delivery address" onPress={onChange} hitSlop={8} className="min-h-8 items-center justify-center pl-2">
          <Text className="text-[14px] font-semibold text-[#155DFC]">Change</Text>
        </Pressable>
      </View>
      <Text className="text-[13px] font-medium leading-[19px] text-[#333333]">{addressText}</Text>
      {phone ? <View className="flex-row items-center gap-2">
        <AppIcon icon={Call02Icon} size={17} color="#505257" />
        <Text className="text-[13px] font-medium text-[#505257]">{phone}</Text>
      </View> : null}
    </View> : <Pressable accessibilityRole="button" onPress={onAdd} className="min-h-12 items-center justify-center rounded-2xl bg-[#F5F5F5] px-4 py-3">
      <Text className="text-[14px] font-semibold text-[#155DFC]">Add delivery address</Text>
    </Pressable>}
  </View>;
}

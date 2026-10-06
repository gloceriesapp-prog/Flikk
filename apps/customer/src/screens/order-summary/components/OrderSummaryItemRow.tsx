import { Text, View } from 'react-native';
import { AppImage } from '../../../components/AppImage';
import { PLACEHOLDER_IMAGE_URI } from '../../../theme/placeholderImage';
import type { SummaryItem } from '../data';
import { formatOrderPrice } from '../utils/formatOrderPrice';

export function OrderSummaryItemRow({ item }: { item: SummaryItem }) {
  return (
    <View className="mx-5 flex-row items-center gap-3 border-b border-ink/5 bg-white px-4 py-4">
      <View className="h-[72px] w-[72px] overflow-hidden rounded-2xl bg-[#F5F7F8] p-1.5">
        <AppImage source={{ uri: item.products?.image_url || PLACEHOLDER_IMAGE_URI }} className="h-full w-full" resizeMode="contain" />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-[14px] font-semibold leading-5 text-ink" numberOfLines={3}>{item.products?.name ?? 'Item'}</Text>
        <Text className="mt-1 text-[12px] text-ink/50" numberOfLines={1}>{[item.unit_at_order ?? item.products?.unit, `Qty ${item.quantity}`].filter(Boolean).join(' · ')}</Text>
        <Text className="mt-1 text-[11px] text-ink/40" numberOfLines={1}>{item.storeName}</Text>
        <Text className="mt-2 text-[14px] font-bold text-ink">{formatOrderPrice(item.unit_price_at_order * item.quantity)}</Text>
      </View>
    </View>
  );
}

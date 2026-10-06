import { Text, View } from 'react-native';
import { AppImage } from '../../../../../components/AppImage';
import type { ApiOrderItem } from '../../../../../api/orders';
import { PLACEHOLDER_IMAGE_URI } from '../../../../../theme/placeholderImage';
import { formatOrderPrice } from '../../../../order-summary/utils/formatOrderPrice';

export function OrderSummaryProductCard({ item }: { item: ApiOrderItem }) {
  return (
    <View className="min-w-0 flex-1 overflow-hidden rounded-2xl border border-ink/5 bg-[#F8F9FA] p-2.5">
      <AppImage source={{ uri: item.products?.image_url || PLACEHOLDER_IMAGE_URI }} className="aspect-square w-full" resizeMode="contain" />
      <Text className="mt-2 text-[13px] font-semibold leading-[18px] text-ink" numberOfLines={2}>{item.products?.name ?? 'Item'}</Text>
      <Text className="mt-1 text-[11px] text-ink/50" numberOfLines={1}>{[item.unit_at_order ?? item.products?.unit, `Qty ${item.quantity}`].filter(Boolean).join(' · ')}</Text>
      <Text className="mt-2 text-[14px] font-bold text-ink">{formatOrderPrice(item.unit_price_at_order * item.quantity)}</Text>
    </View>
  );
}

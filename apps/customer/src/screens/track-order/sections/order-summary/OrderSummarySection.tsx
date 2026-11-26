import { Pressable, Text, View } from 'react-native';
import type { ApiOrderItem } from '../../../../api/orders';
import { actionColors } from '../../../../theme/tokens';
import { formatEta } from '../../../../utils/estimateDelivery';
import { OrderSummaryProductCard } from './components/OrderSummaryProductCard';

// Items listed here; the rest are on the full summary screen.
const PREVIEW_COUNT = 3;

interface Props {
  items: ApiOrderItem[];
  onViewSummary: () => void;
  // Order numbers shown under the summary (one per store order on a trip).
  orderNumbers?: (string | null | undefined)[];
  placedAt?: string | null;
}

export function OrderSummarySection({ items, onViewSummary, orderNumbers = [], placedAt }: Props) {
  const ids = orderNumbers.filter((id): id is string => !!id);
  const placed = placedAt ? new Date(placedAt) : null;
  const placedLabel = placed && Number.isFinite(placed.getTime()) ? formatEta(placed) : null;
  const previewItems = items.slice(0, PREVIEW_COUNT);

  return (
    <View className="mt-2 w-full">
      {/* Title sits above the card, like the other section headings. */}
      <View className="mb-2.5 flex-row items-center justify-between gap-3 px-1">
        <Text accessibilityRole="header" className="text-[16px] font-bold text-ink">Order summary</Text>
        <Pressable onPress={onViewSummary} accessibilityRole="button" hitSlop={8}>
          <Text className="text-[14px] font-semibold" style={{ color: actionColors.fill }}>View summary</Text>
        </Pressable>
      </View>
      <View className="w-full rounded-3xl bg-white p-5">
        {/* Order ID (long-press to copy) on the left, when it was placed on the right. */}
        {ids.length > 0 || placedLabel ? (
          <View className="mb-4 flex-row items-start justify-between gap-4 border-b border-[#EEF0F3] pb-4">
            <View className="min-w-0 flex-1">
              <Text className="text-[12.5px] font-medium text-ink/50">{ids.length > 1 ? 'Order IDs' : 'Order ID'}</Text>
              {ids.map(id => <Text key={id} selectable className="mt-0.5 text-[14.5px] font-semibold text-ink">{id}</Text>)}
            </View>
            {placedLabel ? (
              <View className="items-end">
                <Text className="text-[12.5px] font-medium text-ink/50">Placed at</Text>
                <Text className="mt-0.5 text-[14.5px] font-semibold text-ink">{placedLabel}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
        {previewItems.length > 0 ? (
          <View>
            {previewItems.map((item, index) => (
              <View key={item.id} className={index > 0 ? 'mt-3.5 border-t border-[#F1F3F6] pt-3.5' : undefined}>
                <OrderSummaryProductCard item={item} />
              </View>
            ))}
          </View>
        ) : <Text className="text-[13px] text-ink/50">Item details unavailable.</Text>}
        {items.length > PREVIEW_COUNT && <Text className="mt-3 text-[12.5px] font-medium text-ink/50">+{items.length - PREVIEW_COUNT} more item{items.length - PREVIEW_COUNT === 1 ? '' : 's'} in your order</Text>}
      </View>
    </View>
  );
}

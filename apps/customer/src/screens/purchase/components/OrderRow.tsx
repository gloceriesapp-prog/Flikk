import { ArrowRight02Icon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import { formatOrderPrice } from '../../order-summary/utils/formatOrderPrice';
import { getPurchaseArrivalLabel } from '../orderArrival';
import type { PurchaseOrder } from '../data';
import { OrderProductPreview } from './OrderProductPreview';

interface Props {
  order: PurchaseOrder;
  onPress: () => void;
  now: number;
}

function statusFor(order: PurchaseOrder) {
  if (order.status === 'cancelled') return { color: colors.danger, headline: 'Cancelled' };
  if (order.status === 'failed') return { color: colors.danger, headline: 'Delivery failed' };
  if (order.status === 'placed' || order.status === 'packed') return { color: colors.success, headline: 'Packing' };
  return { color: colors.success, headline: 'On the way' };
}

export function OrderRow({ order, onPress, now }: Props) {
  const delivered = order.status === 'delivered';
  const status = statusFor(order);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityHint="View order details"
      className="bg-white px-4 py-4 active:bg-[#FAFAFB]"
    >
      <View className="flex-row items-center justify-between gap-2">
        <Text className="flex-1 text-[13px] font-semibold text-ink/65">{order.placedAtLabel}</Text>
        {delivered ? (
          <Text className="text-[14px] font-semibold text-ink">{formatOrderPrice(order.total)}</Text>
        ) : (
          <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: `${status.color}1A` }}>
            <Text className="text-[12.5px] font-semibold" style={{ color: status.color }}>{status.headline}</Text>
          </View>
        )}
      </View>

      <OrderProductPreview items={order.items} />

      <View className="mt-3 flex-row items-center gap-3">
        <View className="min-w-0 flex-1">
          <Text
            numberOfLines={2}
            className="text-[18px] font-bold leading-6 tracking-tight"
            style={{ color: delivered ? colors.ink : status.color }}
          >
            {delivered ? order.storeName : getPurchaseArrivalLabel(order, now)}
          </Text>
          <Text className="mt-0.5 text-[12px] font-medium text-ink/55">
            {order.items.length} item{order.items.length === 1 ? '' : 's'}
          </Text>
        </View>
        <View className="h-8 w-8 items-center justify-center rounded-full bg-[#F3F4F6]">
          <AppIcon icon={ArrowRight02Icon} size={16} color={colors.ink} strokeWidth={1.8} />
        </View>
      </View>
    </Pressable>
  );
}

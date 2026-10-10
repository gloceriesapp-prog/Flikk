// One past-delivery card — shared by Home's "today" list AND OrdersScreen's
// history. Renders BOTH terminal states of a RiderOrder: delivered (green,
// full detail) and cancelled (red, reason + why-no-pay). Everything shown
// is a real RiderOrder field (mockOrders.ts) — no fabricated content.

import { CancelCircleIcon, CheckmarkCircle02Icon, Location01Icon, PackageIcon, StarIcon } from '@hugeicons/core-free-icons';
import { memo } from 'react';
import { Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import { formatTimeShort } from '../../../utils/date';
import type { RiderOrder } from '../../../data/mockOrders';

interface Props { order: RiderOrder; }

const CARD_BORDER = '#EAECEE';

export const DeliveryHistoryRow = memo(function DeliveryHistoryRow({ order }: Props) {
  const isCancelled = order.status === 'cancelled';
  // True take-home for this order = fare + tip (same as EarningsScreen rows).
  const total = order.payout + (order.tip ?? 0);
  const accent = isCancelled ? colors.danger : colors.success;

  return (
    <View className="rounded-2xl border bg-white p-4" style={{ borderColor: CARD_BORDER }}>
      {/* Header: status pill (left) + order number (right) */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5 rounded-full px-2.5 py-1" style={{ backgroundColor: isCancelled ? '#FDECEC' : '#E7F6EC' }}>
          <AppIcon icon={isCancelled ? CancelCircleIcon : CheckmarkCircle02Icon} size={14} color={accent} />
          <Text className="text-[12px] font-bold" style={{ color: accent }}>{isCancelled ? 'Cancelled' : 'Delivered'}</Text>
        </View>
        <Text className="text-[12px] font-semibold text-ink/40">{order.orderNumber}</Text>
      </View>

      {/* Customer + drop address */}
      <Text className="mt-3 text-[15px] font-semibold text-ink" numberOfLines={1}>{order.customerName}</Text>
      <View className="mt-1 flex-row items-center gap-1">
        <AppIcon icon={Location01Icon} size={13} color={colors.ink} />
        <Text className="flex-1 text-[12px] text-ink/50" numberOfLines={1}>{order.customerAddress}</Text>
      </View>

      {isCancelled ? (
        // Cancelled: reason instead of the delivered detail row.
        <Text className="mt-2 text-[12px] font-medium" style={{ color: colors.danger }}>{order.cancelReason ?? 'Order cancelled'}</Text>
      ) : (
        // Delivered: items · distance · time, then the ₹ take-home footer.
        <>
          <View className="mt-2 flex-row items-center gap-3">
            <View className="flex-row items-center gap-1">
              <AppIcon icon={PackageIcon} size={13} color={colors.ink} />
              <Text className="text-[12px] text-ink/50">{order.itemCount} {order.itemCount === 1 ? 'item' : 'items'}</Text>
            </View>
            <Text className="text-[12px] text-ink/30">·</Text>
            <Text className="text-[12px] text-ink/50">{order.distanceKm.toFixed(1)} km</Text>
            {order.deliveredAt ? (
              <>
                <Text className="text-[12px] text-ink/30">·</Text>
                <Text className="text-[12px] text-ink/50">{formatTimeShort(order.deliveredAt)}</Text>
              </>
            ) : null}
          </View>
        </>
      )}

      {/* Footer: rating (left) + earnings (right) */}
      <View className="mt-3 flex-row items-center justify-between border-t pt-3" style={{ borderColor: CARD_BORDER }}>
        {!isCancelled && order.customerRating ? (
          <View className="flex-row items-center gap-1">
            <AppIcon icon={StarIcon} size={13} color={colors.gold} />
            <Text className="text-[12px] font-semibold text-ink/60">{order.customerRating.toFixed(1)}</Text>
          </View>
        ) : (
          <Text className="text-[12px] font-medium text-ink/35">{isCancelled ? 'No payout' : 'Not rated'}</Text>
        )}
        <View className="flex-row items-baseline gap-1">
          <Text className={`text-[16px] font-bold ${isCancelled ? 'text-ink/30 line-through' : 'text-ink'}`} style={{ fontVariant: ['tabular-nums'] }}>₹{total}</Text>
          {!isCancelled && order.tip ? <Text className="text-[11px] font-medium text-ink/40">incl. ₹{order.tip} tip</Text> : null}
        </View>
      </View>
    </View>
  );
});

import { Text, View } from 'react-native';
import type { OrderSummary } from '../data';
import { OrderSummaryBillRow } from './OrderSummaryBillRow';
import { formatOrderPrice } from '../utils/formatOrderPrice';

export function OrderSummaryBillCard({ summary }: { summary: OrderSummary }) {
  return (
    <View className="overflow-hidden rounded-3xl bg-white">
      <View className="gap-3 p-5">
        <Text accessibilityRole="header" className="mb-1 text-[18px] font-bold text-ink">Bill breakdown</Text>
        <OrderSummaryBillRow label="Total MRP" value={summary.totalMrp === null ? 'Not recorded' : formatOrderPrice(summary.totalMrp)} />
        <View className="flex-row items-center justify-between gap-3">
          <Text className="text-[13px] font-semibold text-success">Our discount</Text>
          <Text className="text-[13px] font-semibold text-success">{summary.productDiscount === null ? 'Not recorded' : `−${formatOrderPrice(summary.productDiscount)}`}</Text>
        </View>
        <OrderSummaryBillRow label="Our price" value={formatOrderPrice(summary.ourPrice)} />
        {summary.discount > 0 && (
          <View className="flex-row items-center justify-between rounded-xl bg-[#EDF8F2] px-3 py-2.5">
            <Text className="text-[13px] font-semibold text-success">Offer discount</Text>
            <Text className="text-[13px] font-bold text-success">−{formatOrderPrice(summary.discount)}</Text>
          </View>
        )}
        <View className="gap-3 border-t border-ink/5 pt-3">
          <OrderSummaryBillRow label="Item total" value={formatOrderPrice(summary.itemTotal)} bold />
          <OrderSummaryBillRow label="Delivery fee" value={summary.deliveryFee === 0 ? 'Free' : formatOrderPrice(summary.deliveryFee)} />
          <OrderSummaryBillRow label="Handling fee" value={formatOrderPrice(summary.handlingFee)} />
        </View>
      </View>
      <View className="flex-row items-center justify-between gap-3 border-t border-ink/5 px-5 py-4">
        <View className="flex-1">
          <Text className="text-[14px] font-semibold text-ink">Order total</Text>
          <Text className="mt-1 text-[11px] text-ink/50">{summary.paymentLabel}</Text>
        </View>
        <Text className="text-[24px] font-bold tracking-[-0.6px] text-ink">{formatOrderPrice(summary.total)}</Text>
      </View>
    </View>
  );
}

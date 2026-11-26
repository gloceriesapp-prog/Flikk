import { Text, View } from 'react-native';
import { RupeePrice } from '../../../components/RupeePrice';
import { IconlyReceipt } from '../../../components/icons/IconlyReceipt';
import { GILROY } from '../../../theme/fonts';
import type { OrderSummary } from '../data';
import { OrderSummaryBillRow } from './OrderSummaryBillRow';

// Laid out like the cart's Bill details card, so the receipt reads the same
// way the customer saw it before paying.
export function OrderSummaryBillCard({ summary }: { summary: OrderSummary }) {
  return (
    <View className="gap-4 rounded-3xl bg-white px-5 py-5">
      <View className="flex-row items-center gap-2">
        <IconlyReceipt size={20} color="#101C10" />
        <Text accessibilityRole="header" className="text-[16px] font-semibold text-ink">Bill details</Text>
      </View>
      <View className="gap-3">
        <OrderSummaryBillRow label="Total MRP" value={summary.totalMrp ?? 'Not recorded'} />
        <OrderSummaryBillRow label="Our discount" value={summary.productDiscount ?? 'Not recorded'} discount={summary.productDiscount !== null} />
        <OrderSummaryBillRow label="Our price" value={summary.ourPrice} />
        {summary.discount > 0 && <OrderSummaryBillRow label="Coupon discount" value={summary.discount} discount />}
      </View>
      <View className="gap-3 border-t border-gray-100 pt-4">
        <OrderSummaryBillRow label="Item total" value={summary.itemTotal} />
        <OrderSummaryBillRow label="Delivery fee" value={summary.deliveryFee} showFree />
        <OrderSummaryBillRow label="Handling fee" value={summary.handlingFee} showFree />
        {summary.tipAmount > 0 && <OrderSummaryBillRow label="Tip for your rider" value={summary.tipAmount} />}
      </View>
      <View className="flex-row items-center justify-between gap-3 border-t border-gray-100 pt-4">
        <Text className="flex-1 text-[16px] font-semibold text-black">Grand Total</Text>
        <RupeePrice amount={summary.total.toFixed(2)} size={18} style={{ fontFamily: GILROY.semibold }} color="#000000" />
      </View>
    </View>
  );
}

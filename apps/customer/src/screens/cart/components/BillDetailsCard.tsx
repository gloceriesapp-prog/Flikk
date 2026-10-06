import { Text, View } from 'react-native';
import { RupeePrice } from '../../../components/RupeePrice';
import type { CheckoutQuote } from '../../../api/checkout';
import { GILROY } from '../../../theme/fonts';

interface Props { quote: CheckoutQuote; itemCount: number }

const PRICE_STYLE = { fontFamily: GILROY.bold };
const formatAmount = (amount: number) => amount.toFixed(2).replace(/\.00$/, '');

function BillRow({ label, amount, discount = false, showFree = false }: { label: string; amount: number; discount?: boolean; showFree?: boolean }) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <Text className="flex-1 text-[13.5px] font-medium text-ink/65">{label}</Text>
      {showFree && amount === 0 ? (
        <Text className="text-[13.5px] text-success" style={PRICE_STYLE}>FREE</Text>
      ) : (
        <RupeePrice amount={formatAmount(amount)} size={13.5} prefix={discount ? '-' : undefined}
          style={PRICE_STYLE} color={discount ? '#2E9E77' : '#101C10'} />
      )}
    </View>
  );
}

// No local fee or tip calculation: this is the exact bill the server accepts.
export function BillDetailsCard({ quote, itemCount }: Props) {
  const bill = quote.bill;
  const productSavings = Math.max(0, bill.originalItemTotal - bill.itemTotal);
  return (
    <View className="gap-4 rounded-3xl bg-white px-5 py-5">
      <Text className="text-[16px] font-semibold text-ink">Bill details</Text>
      <View className="gap-3">
        <BillRow label={`Total MRP (${itemCount} ${itemCount === 1 ? 'item' : 'items'})`} amount={bill.originalItemTotal} />
        {productSavings > 0 && <BillRow label="Product discount" amount={productSavings} discount />}
        <BillRow label="Items total" amount={bill.itemTotal} />
        <BillRow label="Delivery fee" amount={bill.baseDeliveryFee} showFree />
        {bill.additionalShopFee > 0 && <BillRow label={`Extra shop pickup (${bill.storeCount - 1} ${bill.storeCount === 2 ? 'shop' : 'shops'})`} amount={bill.additionalShopFee} />}
        <BillRow label="Handling fee" amount={bill.handlingFee} />
        {bill.discountAmount > 0 && <BillRow label="Coupon discount" amount={bill.discountAmount} discount />}
      </View>
      <View className="flex-row items-center justify-between border-t border-gray-100 pt-4">
        <Text className="text-[16px] font-semibold text-ink">Amount to pay</Text>
        <RupeePrice amount={formatAmount(bill.total)} size={17} style={PRICE_STYLE} />
      </View>
    </View>
  );
}

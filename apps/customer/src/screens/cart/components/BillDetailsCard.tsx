import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { RupeePrice } from '../../../components/RupeePrice';
import { IconlyReceipt } from '../../../components/icons/IconlyReceipt';
import type { CheckoutQuote } from '../../../api/checkout';
import { GILROY } from '../../../theme/fonts';

interface Props { quote: CheckoutQuote; itemCount: number }

const PRICE_STYLE = { fontFamily: GILROY.bold };
const formatAmount = (amount: number) => amount.toFixed(2).replace(/\.00$/, '');

// Why each fee exists, shown when its dotted label is tapped.
const FEE_INFO = {
  delivery: {
    title: 'Delivery fee',
    message: 'Your small delivery fee helps a hardworking person take care of their family and bring a smile to their home. ❤️',
  },
  handling: {
    title: 'Handling fee',
    message: 'Helping us take care of every order, from packing to delivery. ❤️',
  },
} as const;
type FeeKey = keyof typeof FEE_INFO;

// A dotted underline under a tappable label. textDecorationStyle 'dotted' is
// iOS-only, and a one-sided dashed border doesn't draw on Android, so this
// clips a dashed box down to its bottom edge.
function DottedUnderline() {
  return (
    <View style={{ height: 1, overflow: 'hidden' }}>
      <View style={{ height: 2, borderWidth: 1, borderColor: '#9CA3AF', borderStyle: 'dashed' }} />
    </View>
  );
}

function BillRow({ label, amount, discount = false, showFree = false, onInfo }: {
  label: string; amount: number; discount?: boolean; showFree?: boolean; onInfo?: () => void;
}) {
  const labelText = <Text className="text-[13.5px] font-medium text-ink/65">{label}</Text>;
  return (
    <View className="flex-row items-center justify-between gap-3">
      <View className="flex-1 items-start">
        {onInfo ? (
          <Pressable accessibilityRole="button" accessibilityLabel={`What is the ${label.toLowerCase()}?`} onPress={onInfo} hitSlop={8} className="gap-[3px]">
            {labelText}
            <DottedUnderline />
          </Pressable>
        ) : labelText}
      </View>
      {showFree && amount === 0 ? (
        <Text className="text-[13.5px] text-success" style={PRICE_STYLE}>FREE</Text>
      ) : (
        <RupeePrice amount={formatAmount(amount)} size={13.5} prefix={discount ? '-' : undefined}
          style={PRICE_STYLE} color={discount ? '#2E9E77' : '#101C10'} />
      )}
    </View>
  );
}

function FeeInfoDialog({ fee, onClose }: { fee: FeeKey | null; onClose: () => void }) {
  const info = fee ? FEE_INFO[fee] : null;
  return (
    <Modal visible={info != null} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <Pressable accessibilityLabel="Close" onPress={onClose} className="flex-1 items-center justify-center bg-black/40 px-8">
        {/* Taps inside the card don't close it. */}
        <Pressable onPress={() => {}} className="w-full rounded-3xl bg-white px-6 pb-5 pt-6">
          <Text className="text-[17px] font-semibold text-ink">{info?.title}</Text>
          <Text className="mt-2 text-[14px] leading-[21px] text-ink/70">{info?.message}</Text>
          <Pressable accessibilityRole="button" onPress={onClose} className="mt-5 items-center rounded-2xl bg-[#155DFC] py-3">
            <Text className="text-[15px] font-semibold text-white">Got it</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// No local fee or tip calculation: this is the exact bill the server accepts.
export function BillDetailsCard({ quote, itemCount }: Props) {
  const bill = quote.bill;
  const productSavings = Math.max(0, bill.originalItemTotal - bill.itemTotal);
  const [openFee, setOpenFee] = useState<FeeKey | null>(null);
  return (
    <View className="gap-4 rounded-3xl bg-white px-5 py-5">
      <View className="flex-row items-center gap-2">
        <IconlyReceipt size={20} color="#101C10" />
        <Text className="text-[16px] font-semibold text-ink">Bill details</Text>
      </View>
      <View className="gap-3">
        <BillRow label={`Total MRP (${itemCount} ${itemCount === 1 ? 'item' : 'items'})`} amount={bill.originalItemTotal} />
        {productSavings > 0 && <BillRow label="Product discount" amount={productSavings} discount />}
        <BillRow label="Items total" amount={bill.itemTotal} />
        <BillRow label="Delivery fee" amount={bill.baseDeliveryFee} showFree onInfo={() => setOpenFee('delivery')} />
        {bill.additionalShopFee > 0 && <BillRow label={`Extra shop pickup (${bill.storeCount - 1} ${bill.storeCount === 2 ? 'shop' : 'shops'})`} amount={bill.additionalShopFee} />}
        <BillRow label="Handling fee" amount={bill.handlingFee} onInfo={() => setOpenFee('handling')} />
        {bill.discountAmount > 0 && <BillRow label="Coupon discount" amount={bill.discountAmount} discount />}
      </View>
      <View className="flex-row items-center justify-between border-t border-gray-100 pt-4">
        <Text className="text-[16px] font-semibold text-ink">Amount to pay</Text>
        <RupeePrice amount={formatAmount(bill.total)} size={17} style={PRICE_STYLE} />
      </View>
      <FeeInfoDialog fee={openFee} onClose={() => setOpenFee(null)} />
    </View>
  );
}

// "Bill Details" white card below DeliveryTipCard — Item Total (strikethrough
// original vs discounted, only when any cart item actually carries an
// originalPrice), Handling Fee, Delivery Partner Tip (the amount picked in
// DeliveryTipCard, or an "Add a tip" hint when nothing's selected yet —
// scrolls nowhere, DeliveryTipCard is already the row directly above), and
// Delivery Partner Fee — struck through and green "FREE" once the cart
// crosses FREE_DELIVERY_THRESHOLD, reusing the exact same threshold
// CartBar/FreeDeliveryBar already use rather than a second copy of that
// logic. To Pay is this card's own total, not selectCartGrandTotal (that
// selector is shared with CheckoutScreen and doesn't know about tips or the
// free-delivery waiver — recomputing it here would either change
// CheckoutScreen's total too or silently diverge from what this screen
// displays).
//
// To Pay also shows a strikethrough original total (what the same fees
// would've added up to without the item discount or the free-delivery
// waiver) next to the real figure — computed the same way itemTotal's own
// strikethrough is, just carried through the fee math too, per an explicit
// ask to mirror it there as well.

import { Text, View } from 'react-native';
import { CART_DELIVERY_FEE, CART_HANDLING_FEE, FREE_DELIVERY_THRESHOLD } from '../../../store/useCartStore';
import type { TipSelection } from './DeliveryTipCard';

interface Props {
  itemTotal: number;
  originalItemTotal: number | null;
  tip: TipSelection;
}

export function BillDetailsCard({ itemTotal, originalItemTotal, tip }: Props) {
  const isDeliveryFree = itemTotal >= FREE_DELIVERY_THRESHOLD;
  const tipAmount = typeof tip === 'number' ? tip : 0;
  const deliveryFee = isDeliveryFree ? 0 : CART_DELIVERY_FEE;
  const toPay = itemTotal + CART_HANDLING_FEE + tipAmount + deliveryFee;
  // Same fee math as toPay, but with the item discount and the free-delivery
  // waiver both undone — what the shopper would've paid without either.
  const originalToPay = originalItemTotal
    ? (originalItemTotal > itemTotal ? originalItemTotal : itemTotal) + CART_HANDLING_FEE + tipAmount + CART_DELIVERY_FEE
    : isDeliveryFree
      ? itemTotal + CART_HANDLING_FEE + tipAmount + CART_DELIVERY_FEE
      : null;

  return (
    <View className="gap-3 rounded-2xl bg-white px-4 py-4">
      <Text className="text-xs font-bold uppercase tracking-wide text-ink/50">Bill Details</Text>

      <View className="gap-2.5">
        <View className="flex-row items-center justify-between">
          <Text className="text-[15px] text-ink/70">Item Total</Text>
          <View className="flex-row items-center gap-2">
            {originalItemTotal && originalItemTotal > itemTotal && (
              <Text className="text-sm text-ink/40 line-through">₹{originalItemTotal}</Text>
            )}
            <Text className="text-[15px] font-semibold text-ink">₹{itemTotal}</Text>
          </View>
        </View>

        <View className="flex-row items-center justify-between">
          <Text className="text-[15px] text-ink/70">Handling Fee</Text>
          <Text className="text-[15px] font-semibold text-ink">₹{CART_HANDLING_FEE}</Text>
        </View>

        <View className="h-px bg-mist" />

        <View className="flex-row items-center justify-between">
          <Text className="text-[15px] text-ink/70">Delivery Partner Tip</Text>
          {tip === null ? (
            <Text className="text-[15px] font-semibold text-lime-deep">Add a tip</Text>
          ) : tip === 'other' ? (
            <Text className="text-[15px] font-semibold text-ink">—</Text>
          ) : (
            <Text className="text-[15px] font-semibold text-ink">₹{tip}</Text>
          )}
        </View>

        <View className="h-px bg-mist" />

        <View className="flex-row items-center justify-between">
          <Text className="text-[15px] text-ink/70">Delivery Partner Fee</Text>
          {isDeliveryFree ? (
            <View className="flex-row items-center gap-2">
              <Text className="text-sm text-ink/40 line-through">₹{CART_DELIVERY_FEE}</Text>
              <Text className="text-[15px] font-bold text-success">FREE</Text>
            </View>
          ) : (
            <Text className="text-[15px] font-semibold text-ink">₹{CART_DELIVERY_FEE}</Text>
          )}
        </View>

        <View className="h-px bg-mist" />

        <View className="flex-row items-center justify-between pt-0.5">
          <Text className="text-base font-bold text-ink">To Pay</Text>
          <View className="flex-row items-center gap-2">
            {originalToPay && originalToPay > toPay && <Text className="text-sm text-ink/40 line-through">₹{originalToPay}</Text>}
            <Text className="text-base font-bold text-ink">₹{toPay}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

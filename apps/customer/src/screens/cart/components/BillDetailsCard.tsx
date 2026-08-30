// "Bill Details" white card below DeliveryTipCard — styled after Instamart's
// own minimal bill sheet (dotted row dividers, a plain uppercase label, a
// bare-text "Add a tip" link, no per-row icon clutter) as a design
// reference, not a pixel copy: Item Total (strikethrough original vs
// discounted, only when any cart item actually carries an originalPrice),
// Handling Fee, Delivery Partner Tip (the amount picked in DeliveryTipCard,
// or a real "Add a tip" link when nothing's selected yet — tapping it calls
// onAddTip, which CartScreen wires to select the popular ₹20 preset
// directly, same amount DeliveryTipCard itself calls out as its own
// popular pick), and Delivery Partner Fee — struck through and green "FREE"
// once the cart crosses FREE_DELIVERY_THRESHOLD (reusing the exact same
// threshold CartBar/FreeDeliveryBar already use), with a real "spend ₹X
// more for free delivery" nudge underneath while it hasn't been crossed yet
// — computed from the same threshold, not a copy-pasted number. To Pay
// keeps its own highlighted block below the list (this app's own addition,
// not from the reference) since a bill sheet with no visually distinct
// final total is a worse pattern to copy, not a better one.
//
// To Pay total is this card's own total, not selectCartGrandTotal (that
// selector is shared with CheckoutScreen and doesn't know about tips or the
// free-delivery waiver — recomputing it here would either change
// CheckoutScreen's total too or silently diverge from what this screen
// displays). It also shows a strikethrough original total (what the same
// fees would've added up to without the item discount or the free-delivery
// waiver) next to the real figure, computed the same way itemTotal's own
// strikethrough is.

import { ReceiptIndianRupeeIcon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { CART_DELIVERY_FEE, CART_HANDLING_FEE, FREE_DELIVERY_THRESHOLD } from '../../../store/useCartStore';
import type { TipSelection } from './DeliveryTipCard';

const ACCENT = '#155DFC';

interface Props {
  itemTotal: number;
  originalItemTotal: number | null;
  itemCount: number;
  tip: TipSelection;
  onAddTip?: () => void;
}

function DottedDivider() {
  return <View className="h-px border-t border-dashed border-gray-200" />;
}

export function BillDetailsCard({ itemTotal, originalItemTotal, itemCount, tip, onAddTip }: Props) {
  const isDeliveryFree = itemTotal >= FREE_DELIVERY_THRESHOLD;
  const amountToFreeDelivery = Math.max(0, FREE_DELIVERY_THRESHOLD - itemTotal);
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
      <View className="flex-row items-center gap-0">
        {/* <View className="h-6 w-6 items-center justify-center">
          <AppIcon icon={ReceiptIndianRupeeIcon} size={13} color="#6B7280" />
        </View> */}
        <Text className="text-xs font-bold uppercase tracking-wide text-ink/50">Bill Details</Text>
      </View>

      <View className="gap-2.5">
        <View className="flex-row items-center justify-between border-t border-dashed border-gray-200 pt-3">
          <Text className="text-[15px] text-ink/70">
            Item Total <Text className="text-[12.5px] text-ink/40">({itemCount} {itemCount === 1 ? 'item' : 'items'})</Text>
          </Text>
          <View className="flex-row items-center gap-2">
            {originalItemTotal && originalItemTotal > itemTotal && (
              <Text className="text-sm text-ink/40 line-through">₹{originalItemTotal}</Text>
            )}
            <Text className="text-[15px] font-medium tabular-nums text-ink/75">₹{itemTotal}</Text>
          </View>
        </View>

        <View className="flex-row items-center justify-between">
          <Text className="text-[15px] text-ink/70">Handling Fee</Text>
          <Text className="text-[15px] font-medium tabular-nums text-ink/75">₹{CART_HANDLING_FEE}</Text>
        </View>


        <View className="flex-row items-center justify-between border-t border-dashed border-gray-200 pt-3">
          <Text className="text-[15px] text-ink/70">Delivery Partner Tip</Text>
          {tip === null ? (
            <Pressable onPress={onAddTip} hitSlop={6}>
              <Text className="text-[15px] font-bold" style={{ color: ACCENT }}>
                Add a tip
              </Text>
            </Pressable>
          ) : tip === 'other' ? (
            <Text className="text-[15px] font-semibold text-ink">—</Text>
          ) : (
            <Text className="text-[15px] font-medium tabular-nums text-ink/75">₹{tip}</Text>
          )}
        </View>


        <View className="flex-row items-center justify-between border-t border-dashed border-gray-200 pt-3">
          <Text className="text-[15px] text-ink/70">Delivery Partner Fee</Text>
          {isDeliveryFree ? (
            <View className="flex-row items-center gap-2">
              <Text className="text-sm text-ink/40 line-through">₹{CART_DELIVERY_FEE}</Text>
              <Text className="text-[15px] font-bold text-success">FREE</Text>
            </View>
          ) : (
            <Text className="text-[15px] font-medium tabular-nums text-ink/75">₹{CART_DELIVERY_FEE}</Text>
          )}
        </View>

        {/* {!isDeliveryFree ? (
          <Text className="text-[12.5px] leading-[17px] text-ink/40">
            Add items worth ₹{amountToFreeDelivery} more to get free delivery on this order
          </Text>
        ) : null} */}
      </View>

      <View className="flex-row items-center justify-between border-t border-dashed border-gray-200 pt-3">
        <View>
          <Text className="text-base font-semibold text-ink">To Pay</Text>
        </View>
        <View className="flex-row items-center gap-2">
          {originalToPay && originalToPay > toPay && <Text className="text-sm text-ink/40 line-through">₹{originalToPay}</Text>}
          <Text className="text-lg font-semibold tabular-nums text-ink">₹{toPay}</Text>
        </View>
      </View>
    </View>
  );
}

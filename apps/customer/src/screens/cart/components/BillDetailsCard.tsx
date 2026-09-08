// "Price breakdown" card — redesigned to match a reference receipt-style
// layout: icon-badged rows, a "Saved ₹X" chip beside Cart total, a real
// FREE strike-through on delivery once free-delivery kicks in, a bold
// Total payable row, and a separate scalloped-top savings banner fused
// to the card's own bottom edge (the classic torn-receipt look — a row
// of small circles colored to match the *page* background, not the
// card, so they read as cutouts rather than dots sitting on top of
// anything).
//
// Wording deliberately diverges from Blinkit/Instamart's own labels
// ("Bill details", "Delivery Partner Tip/Fee", "Handling charge",
// "Grand total") — this reads as a copy of theirs otherwise, not just a
// similar layout. "Tip for your rider" also matches this app's own
// vocabulary (CLAUDE.md: "rider", never "delivery partner") rather than
// borrowing a competitor's term for the same role.
//
// No fabricated "Flat ₹X OFF" row (a reference screenshot had one) — this
// app has no cart-level coupon/promo system, only real per-item discounts
// (originalPrice vs price) and the real free-delivery waiver, both
// already tracked. Inventing a flat discount number with nothing behind
// it would just be a wrong price shown to a paying customer. Everything
// shown here is a real, computed figure.
//
// itemTotal/originalItemTotal/tip inputs and the toPay math are
// unchanged from the previous version of this card — CheckoutScreen's
// own selectCartGrandTotal deliberately doesn't know about tips or the
// free-delivery waiver, so this card keeps computing its own total
// rather than risk the two silently diverging.

import { Motorbike01Icon, ReceiptIndianRupeeIcon, Wallet01Icon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { CART_DELIVERY_FEE, CART_HANDLING_FEE, FREE_DELIVERY_THRESHOLD } from '../../../store/useCartStore';
import type { TipSelection } from './DeliveryTipCard';

const ACCENT = '#155DFC';
// Matches CartScreen's own page background exactly — the scallop dots
// (ScallopEdge below) have to be this exact color to read as cutouts
// rather than visible circles sitting on the card.
const PAGE_BG = '#F1F2F4';
const SCALLOP_DOT_COUNT = 16;

interface Props {
  itemTotal: number;
  originalItemTotal: number | null;
  itemCount: number;
  tip: TipSelection;
  onAddTip?: () => void;
}

function RowIcon({ icon }: { icon: typeof Motorbike01Icon }) {
  return (
    <View className="h-6 w-6 items-center justify-center rounded-full bg-gray-100">
      <AppIcon icon={icon} size={12} color="#6B7280" />
    </View>
  );
}

function RowLabel({ children }: { children: string }) {
  return <Text className="text-[13px] font-medium text-ink/75">{children}</Text>;
}

function ScallopEdge() {
  return (
    <View className="h-3.5 flex-row items-center justify-between px-3" style={{ backgroundColor: '#EFF4FF' }}>
      {Array.from({ length: SCALLOP_DOT_COUNT }).map((_, i) => (
        <View key={i} className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: PAGE_BG, marginTop: -7 }} />
      ))}
    </View>
  );
}

export function BillDetailsCard({ itemTotal, originalItemTotal, itemCount, tip, onAddTip }: Props) {
  const isDeliveryFree = itemTotal >= FREE_DELIVERY_THRESHOLD;
  const tipAmount = typeof tip === 'number' ? tip : 0;
  const deliveryFee = isDeliveryFree ? 0 : CART_DELIVERY_FEE;
  const toPay = itemTotal + CART_HANDLING_FEE + tipAmount + deliveryFee;
  const originalToPay = originalItemTotal
    ? (originalItemTotal > itemTotal ? originalItemTotal : itemTotal) + CART_HANDLING_FEE + tipAmount + CART_DELIVERY_FEE
    : isDeliveryFree
      ? itemTotal + CART_HANDLING_FEE + tipAmount + CART_DELIVERY_FEE
      : null;

  // Real savings only — item-level discount (originalItemTotal vs
  // itemTotal) plus the delivery fee actually waived, nothing else.
  const itemSavings = originalItemTotal && originalItemTotal > itemTotal ? originalItemTotal - itemTotal : 0;
  const deliverySavings = isDeliveryFree ? CART_DELIVERY_FEE : 0;
  const totalSavings = itemSavings + deliverySavings;

  return (
    <View className="overflow-hidden rounded-3xl bg-white shadow-sm shadow-black/5">
      <View className="gap-4 px-5 pt-5 pb-4">
        <Text className="text-base font-semibold text-ink">Bill details</Text>

        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <RowIcon icon={ReceiptIndianRupeeIcon} />
              <Text className="text-[13px] font-medium text-ink/75">
                Cart total <Text className="text-[11px] text-ink/40">({itemCount} {itemCount === 1 ? 'item' : 'items'})</Text>
              </Text>
              {itemSavings > 0 && (
                <View className="rounded-full bg-blue-50 px-1.5 py-0.5">
                  <Text className="text-[10px] font-semibold" style={{ color: ACCENT }}>
                    Saved ₹{itemSavings}
                  </Text>
                </View>
              )}
            </View>
            <View className="flex-row items-center gap-1.5">
              {itemSavings > 0 && <Text className="text-xs text-ink/35 line-through font-medium">₹{originalItemTotal}</Text>}
              <Text className="text-[13px] font-medium tabular-nums text-ink">₹{itemTotal}</Text>
            </View>
          </View>

          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <RowIcon icon={Motorbike01Icon} />
              <RowLabel>Delivery fee</RowLabel>
            </View>
            {isDeliveryFree ? (
              <View className="flex-row items-center gap-1.5">
                <Text className="text-xs text-ink/35 line-through">₹{CART_DELIVERY_FEE}</Text>
                <Text className="text-[13px] font-semibold" style={{ color: ACCENT }}>
                  FREE
                </Text>
              </View>
            ) : (
              <Text className="text-[13px] font-medium tabular-nums text-ink">₹{CART_DELIVERY_FEE}</Text>
            )}
          </View>

          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <RowIcon icon={Wallet01Icon} />
              <RowLabel>Packing fee</RowLabel>
            </View>
            <Text className="text-[13px] font-medium tabular-nums text-ink">₹{CART_HANDLING_FEE}</Text>
          </View>

          <View className="flex-row items-center justify-between">
            <Text className="text-[13px] font-medium text-ink/75">Tip for your rider</Text>
            {tip === null ? (
              <Pressable onPress={onAddTip} hitSlop={6}>
                <Text className="text-[13px] font-medium" style={{ color: ACCENT }}>
                  Add a tip
                </Text>
              </Pressable>
            ) : tip === 'other' ? (
              <Text className="text-[13px] font-semibold text-ink">—</Text>
            ) : (
              <Text className="text-[13px] font-semibold tabular-nums text-ink">₹{tip}</Text>
            )}
          </View>
        </View>

        <View className="flex-row items-center justify-between border-t border-gray-100 pt-3.5">
          <Text className="text-[15px] font-semibold text-ink">Total payable</Text>
          <View className="flex-row items-center gap-1.5">
            {originalToPay && originalToPay > toPay && <Text className="text-xs text-ink/35 line-through font-semibold">₹{originalToPay}</Text>}
            <Text className="text-lg font-semibold tabular-nums text-ink">₹{toPay}</Text>
          </View>
        </View>
      </View>

      {totalSavings > 0 && (
        <>
          <ScallopEdge />
          <View className="gap-0.5 px-5 pb-3.5 pt-2" style={{ backgroundColor: '#EFF4FF' }}>
            <View className="flex-row items-center justify-between">
              <Text className="text-[13px] font-semibold" style={{ color: ACCENT }}>
                You saved
              </Text>
              <Text className="text-base font-semibold" style={{ color: ACCENT }}>
                ₹{totalSavings}
              </Text>
            </View>
            {deliverySavings > 0 && (
              <Text className="text-[11.5px] text-ink/60 font-medium">₹{deliverySavings} of that from free delivery</Text>
            )}
          </View>
        </>
      )}
    </View>
  );
}

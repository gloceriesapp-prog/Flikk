// Itemized bill card — "E-Receipt" heading + timestamp, order id/payment/
// delivery address, total, line items, fee breakdown, then a dashed
// tear-line + a real scannable barcode + "THANK YOU!" — everything a real
// till receipt carries, not just the price breakdown. `items` is a
// snapshot passed in via route params, not read live from useCartStore —
// the cart is already cleared by the time this renders (see
// ReceiptScreen.tsx).
//
// The barcode encodes a receipt URL (flikk.app/r/<orderId>) via
// components/BarcodeSvg.tsx — real CODE128, actually scannable with a
// phone camera, not a decorative glyph. That URL doesn't resolve to
// anything yet — no hosted receipt-view page exists on the backend — so
// scanning it today is a dead link; wire a real page up when one exists.
// (Originally tried react-native-barcode-builder — it renders through the
// legacy @react-native-community/art native module, which Expo Go doesn't
// register and crashed with "View config not found for component
// 'ARTShape'". BarcodeSvg draws the same CODE128 bars with react-native-svg
// instead, which already works in this app — see its own file header.)
//
// The card is `overflow-hidden` and the barcode sits inside the card's own
// padding (not full-bleed past its edges) — BarcodeSvg scales its bars to
// whatever width it's given (see that file), so it can never overflow the
// card again the way it did before.

import { Text, View } from 'react-native';
import { BarcodeSvg } from '../../../components/BarcodeSvg';
import { colors } from '../../../theme/tokens';
import { CART_DELIVERY_FEE, CART_HANDLING_FEE, type CartItem } from '../../../store/useCartStore';

interface Props {
  orderId: string;
  paymentMethodLabel: string;
  deliveryAddress: string;
  items: CartItem[];
  itemTotal: number;
  total: number;
}

function FeeRow({ label, value }: { label: string; value: number }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-sm font-medium text-ink/50">{label}</Text>
      <Text className="text-sm font-semibold text-ink/70">₹{value}</Text>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-start justify-between gap-4">
      <Text className="text-sm font-medium text-ink/60">{label}</Text>
      <Text className="flex-1 text-right text-sm font-semibold text-ink" numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

export function ReceiptCard({ orderId, paymentMethodLabel, deliveryAddress, items, itemTotal, total }: Props) {
  const orderedAt = new Date();
  const dateLabel = orderedAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeLabel = orderedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const receiptUrl = `https://flikk.app/r/${orderId.replace('#', '')}`;
  const paymentStatusLabel =
    paymentMethodLabel === 'Cash on Delivery' ? 'Cash on Delivery' : `Paid via ${paymentMethodLabel}`;

  return (
    <View className="w-full overflow-hidden rounded-3xl border border-gray-100 bg-gray-200 p-6 shadow-sm shadow-black/5">
      <View className="gap-2.5">
        <DetailRow label="Date" value={dateLabel} />
        <DetailRow label="Time" value={timeLabel} />
        <DetailRow label="Order ID" value={orderId} />
        <DetailRow label="Payment" value={paymentStatusLabel} />
        <DetailRow label="Deliver to" value={deliveryAddress} />
      </View>

      <View className="mt-4 flex-row items-center justify-between border-t border-dashed border-gray-300 pt-4">
        <Text className="text-xl font-bold text-ink">Total Payment</Text>
        <Text className="text-xl font-bold text-ink">₹{total}</Text>
      </View>

      <View className="mt-3 gap-2.5">
        {items.map((item) => (
          <View key={item.id} className="flex-row items-center justify-between">
            <Text className="flex-1 pr-3 text-base text-ink/70" numberOfLines={1}>
              {item.name} × {item.quantity}
            </Text>
            <Text className="text-base font-semibold text-ink">₹{item.price * item.quantity}</Text>
          </View>
        ))}
      </View>

      <View className="mt-3 gap-2 border-t border-gray-200 pt-3">
        <FeeRow label="Item total" value={itemTotal} />
        <FeeRow label="Delivery fee" value={CART_DELIVERY_FEE} />
        <FeeRow label="Handling fee" value={CART_HANDLING_FEE} />
      </View>

      <View className="mt-5 w-full items-center border-t border-dashed border-gray-300 pt-5">
        <BarcodeSvg value={receiptUrl} height={64} color={colors.ink} />
        <Text className="mt-3 text-sm font-bold uppercase tracking-widest text-ink/50">Thank you! You made our day.</Text>
      </View>
    </View>
  );
}

// Itemized bill card — "E-Receipt" heading + timestamp, order id/payment/
// delivery address, total, line items, fee breakdown, then a dashed
// tear-line + a real scannable barcode + "THANK YOU!" — everything a real
// till receipt carries, not just the price breakdown. `items` is a
// snapshot passed in via route params, not read live from useCartStore —
// the cart is already cleared by the time this renders (see
// ReceiptScreen.tsx).
//
// The barcode encodes the real order number (orders.order_number, e.g.
// FLK-100042) via components/BarcodeSvg.tsx — real CODE128, scannable, and
// the same id support/partner/admin look orders up by. No hosted
// receipt page exists, so it deliberately encodes no URL.
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
import { RupeePrice } from '../../../components/RupeePrice';
import { BarcodeSvg } from '../../../components/BarcodeSvg';
import { colors } from '../../../theme/tokens';
import type { CartItem } from '../../../store/useCartStore';
import { estimateDeliveryTime, formatEta } from '../../../utils/estimateDelivery';

interface Props {
  orderId: string;
  paymentMethodLabel: string;
  deliveryAddress: string;
  items: CartItem[];
  itemTotal: number;
  total: number;
  // The server-recorded delivery deadline, shared with order tracking.
  placedAt: string;
  estimatedDeliveryMinutes?: number | null;
  estimatedDeliveryAt?: string | null;
}

function FeeRow({ label, value }: { label: string; value: number }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-sm font-medium text-ink/50">{label}</Text>
      <RupeePrice amount={value} size={14} color="#101C10B3" />
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

export function ReceiptCard({
  orderId,
  paymentMethodLabel,
  deliveryAddress,
  items,
  itemTotal,
  total,
  placedAt,
  estimatedDeliveryMinutes,
  estimatedDeliveryAt,
}: Props) {
  // Real placed_at now, not `new Date()` at render time — this card can
  // render a little after the order actually landed (payment-processing
  // sheet, navigation), so "now" was drifting a few seconds ahead of when
  // the order was genuinely placed.
  const orderedAt = new Date(placedAt);
  const dateLabel = orderedAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeLabel = orderedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const eta = estimateDeliveryTime(placedAt, estimatedDeliveryMinutes, estimatedDeliveryAt);
  const barcodeValue = orderId.replace('#', '');
  const paymentStatusLabel =
    paymentMethodLabel === 'Cash on Delivery' ? 'Cash on Delivery' : `Paid via ${paymentMethodLabel}`;

  return (
    <View className="w-full overflow-hidden rounded-3xl border border-gray-100 bg-gray-200 p-6 shadow-sm shadow-black/5">
      {/* Same "when will it actually arrive" answer as TrackOrderScreen's
          own ETA card, right up top here too — an explicit ask, since a
          receipt is the very first place a customer looks for this. */}
      <View className="mb-4 items-center rounded-2xl bg-lime-soft py-3">
        <Text className="text-sm font-semibold text-lime-deep">Estimated Delivery</Text>
        <Text className="text-xl font-bold text-ink">{formatEta(eta)}</Text>
      </View>

      <View className="gap-2.5">
        <DetailRow label="Date" value={dateLabel} />
        <DetailRow label="Time" value={timeLabel} />
        <DetailRow label="Order ID" value={orderId} />
        <DetailRow label="Payment" value={paymentStatusLabel} />
        <DetailRow label="Deliver to" value={deliveryAddress} />
      </View>

      <View className="mt-4 flex-row items-center justify-between border-t border-dashed border-gray-300 pt-4">
        <Text className="text-xl font-bold text-ink">Total Payment</Text>
        <RupeePrice amount={total} size={20} />
      </View>

      <View className="mt-3 gap-2.5">
        {items.map((item) => (
          <View key={item.id} className="flex-row items-center justify-between">
            <Text className="flex-1 pr-3 text-base text-ink/70" numberOfLines={1}>
              {item.name} × {item.quantity}
            </Text>
            <RupeePrice amount={item.price * item.quantity} size={16} />
          </View>
        ))}
      </View>

      {/* One combined "Delivery & handling" line, derived from the real
          charged `total` (total - itemTotal) — both fees are admin-
          editable now (backend/src/lib/deliverySettings.ts), so there's no
          longer a fixed handling-fee constant to split them apart with,
          and no per-order breakdown is stored server-side to read one
          back from either. This order was placed at whatever the real
          fees were at the time; deriving the combined figure from the
          real total this receipt already shows is always correct, with
          no separate historical-fee fetch needed. */}
      <View className="mt-3 gap-2 border-t border-gray-200 pt-3">
        <FeeRow label="Item total" value={itemTotal} />
        <FeeRow label="Delivery & handling" value={Math.max(total - itemTotal, 0)} />
      </View>

      <View className="mt-5 w-full items-center border-t border-dashed border-gray-300 pt-5">
        <BarcodeSvg value={barcodeValue} height={64} color={colors.ink} />
        <Text className="mt-3 text-sm font-bold uppercase tracking-widest text-ink/50">Thank you! You made our day.</Text>
      </View>
    </View>
  );
}

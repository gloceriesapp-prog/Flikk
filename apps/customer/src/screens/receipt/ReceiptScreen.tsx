// Reached once CheckoutScreen's own handlePay finishes — either
// immediately (Cash on Delivery) or after a real Razorpay Checkout
// success + server-side signature verification (Pay Online). The cart is
// already cleared by then, so `items`/`amount`/`paymentMethodLabel` arrive
// as a route-param snapshot, not read live from useCartStore.
//
// "Track Order" opens screens/track-order/TrackOrderScreen.tsx — status-only
// 4-stage tracking (no live map/GPS, see that screen's own header for why).

import { Cancel01Icon, Download03Icon } from '@hugeicons/core-free-icons';
import { Pressable, ScrollView, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/AppIcon';
import { SuccessSeal } from '../../components/SuccessSeal';
import { colors } from '../../theme/tokens';
import { ReceiptCard } from './components/ReceiptCard';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'Receipt'>;

export function ReceiptScreen({ navigation, route }: Props) {
  const { orderId: realOrderId, orderNumber, amount, items, paymentMethodLabel, placedAt, avgPrepMinutes, isTrip, deliveryAddress } = route.params;
  // Real orders.order_number ("FLK-100042"), shown as-is — no "#" prefix,
  // matching exactly what the partner app and TrackOrderScreen display for
  // the same order. This used to be a locally-sliced fragment of the UUID
  // PK ("#0272FCC6") that looked like an order id but wasn't the same
  // identifier as anything else in the system — the actual bug this fixes
  // ("order id doesn't match between customer and partner app"). The full
  // UUID still rides along in route params for TrackOrder's own real
  // lookup, this is display-only.
  const orderId = orderNumber;
  const itemTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  // A real reset, not navigate('Home') — this order's Checkout/Receipt are
  // done with, so leaving them in the stack meant a back-gesture from Home
  // could land back on a receipt for an already-cleared cart. Same pattern
  // LocationSearchScreen's own post-checkout reset uses.
  function goHome() {
    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  }

  return (
    <View className="flex-1 bg-white pt-safe">
      <View className="flex-row items-center justify-between px-5 pt-2">
        <Pressable onPress={goHome} hitSlop={12} className="h-11 w-11 items-center justify-center">
          <AppIcon icon={Cancel01Icon} size={20} color={colors.ink} />
        </Pressable>
        <Text className="text-[17px] font-semibold text-ink">E-Receipt</Text>
        <Pressable hitSlop={12} className="h-11 w-11 items-center justify-center">
          <AppIcon icon={Download03Icon} size={20} color={colors.ink} />
        </Pressable>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="items-center gap-5 px-4 pb-6 pt-4">
        <SuccessSeal size={76} color={colors.success} />

        <View className="items-center gap-1.5">
          <Text className="text-[23px] font-extrabold tracking-tight text-ink">Payment Successful</Text>
          <Text className="max-w-[280px] text-center text-[14.5px] font-medium leading-5 text-ink/55">
            Your order is confirmed and on its way to the store. Thank you for shopping with Gloceries.
          </Text>
        </View>

        <ReceiptCard
          orderId={orderId}
          paymentMethodLabel={paymentMethodLabel}
          deliveryAddress={deliveryAddress}
          items={items}
          itemTotal={itemTotal}
          total={amount}
          placedAt={placedAt}
          avgPrepMinutes={avgPrepMinutes}
        />
      </ScrollView>

      {/* No footer background — sits directly on the page. One horizontal
          row, equal-width buttons (flex-1 on both). Track Order uses this
          app's own blue accent; Continue Shopping is a plain solid box now
          (was real Liquid Glass on iOS 26 via GlassView/BlurView — dropped
          per an explicit ask for a simpler flat box instead). */}
      <View className="flex-row gap-3 px-5 pb-safe-offset-4 pt-4">
        <Pressable
          onPress={() => navigation.navigate('TrackOrder', { orderId: realOrderId, paymentMethodLabel, isTrip })}
          className="flex-1 items-center rounded-2xl py-4"
          style={{ backgroundColor: '#155dfc' }}
        >
          <Text className="text-lg font-medium text-white">Track Order</Text>
        </Pressable>

        <Pressable
          onPress={goHome}
          className="flex-1 items-center justify-center rounded-2xl border border-black/10 bg-[#f5f5f5] py-4"
        >
          <Text className="text-lg font-medium text-ink">Continue Shopping</Text>
        </Pressable>
      </View>
    </View>
  );
}

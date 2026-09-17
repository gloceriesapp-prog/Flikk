// Reached once CheckoutScreen's own handlePay finishes — either
// immediately (Cash on Delivery) or after a real Razorpay Checkout
// success + server-side signature verification (Pay Online). The cart is
// already cleared by then, so `items`/`amount`/`paymentMethodLabel` arrive
// as a route-param snapshot, not read live from useCartStore.
//
// "Track Order" opens screens/track-order/TrackOrderScreen.tsx — status-only
// 4-stage tracking (no live map/GPS, see that screen's own header for why).

import { Cancel01Icon, Download03Icon } from '@hugeicons/core-free-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/AppIcon';
import { SuccessSeal } from '../../components/SuccessSeal';
import { colors } from '../../theme/tokens';
import { ReceiptCard } from './components/ReceiptCard';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'Receipt'>;

// expo-glass-effect's real iOS 26 Liquid Glass — Android and older iOS fall
// back to BlurView's light glass instead (see the button below). Checked
// once, not per-render — it can't change while the app is running.
const LIQUID_GLASS_AVAILABLE = isLiquidGlassAvailable();

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

      <ScrollView className="flex-1" contentContainerClassName="items-center gap-5 px-4 pb-6 pt-3">
        <SuccessSeal size={72} color={colors.success} />

        <View className="items-center gap-0">
          <Text className="text-xl font-semibold text-ink">Order Confirmed!</Text>
          <Text className="text-center text-base text-ink/50 font-medium">Thank you for shopping with Gloceries.</Text>
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
          app's own blue accent (#1447E6, same as CartCheckoutFooter/
          CheckoutHeader's back button), not plain black; Continue Shopping
          is real Liquid Glass on iOS 26 (GlassView), falling back to
          BlurView's light glass everywhere else — glass only applies to
          this one button, not Track Order. */}
      <View className="flex-row gap-3 px-5 pb-safe-offset-4 pt-4">
        <Pressable
          onPress={() => navigation.navigate('TrackOrder', { orderId: realOrderId, paymentMethodLabel, isTrip })}
          className="flex-1 items-center rounded-2xl py-4"
          style={{ backgroundColor: '#1447E6' }}
        >
          <Text className="text-lg font-semibold text-white">Track Order</Text>
        </Pressable>

        <Pressable
          onPress={goHome}
          className="flex-1 overflow-hidden rounded-2xl border border-black/10 shadow-sm shadow-black/10"
        >
          {/* GlassView/BlurView aren't NativeWind-patched components —
              className is silently ignored on them (same gotcha as
              LinearGradient elsewhere in this app), which is why the glass
              previously collapsed to nothing and the text floated outside
              it. Glass goes on its own absolute-fill background layer via
              style; the actual padding/centering lives on a plain View
              stacked on top of it instead. Border/shadow live on this outer
              Pressable, not the inner View — that's what gives the whole
              pill a defined edge instead of just outlining the text. */}
          {LIQUID_GLASS_AVAILABLE ? (
            <GlassView glassEffectStyle="regular" style={StyleSheet.absoluteFill} />
          ) : (
            <BlurView intensity={80} tint="systemThickMaterialLight" style={StyleSheet.absoluteFill} />
          )}
          <View className="items-center py-4">
            <Text className="text-lg font-semibold text-ink">Continue Shopping</Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

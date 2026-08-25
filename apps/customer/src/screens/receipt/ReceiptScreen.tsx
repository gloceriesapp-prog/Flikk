// Reached automatically once PaymentProcessingSheet finishes its
// success phase (see checkout/CheckoutScreen.tsx) — the cart is already
// cleared by then, so `items`/`amount`/`paymentMethodLabel` arrive as a
// route-param snapshot, not read live from useCartStore.
//
// "Track Order" opens screens/track-order/TrackOrderScreen.tsx — status-only
// 4-stage tracking (no live map/GPS, see that screen's own header for why).

import { useState } from 'react';
import { Cancel01Icon, Download03Icon } from '@hugeicons/core-free-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/AppIcon';
import { SuccessSeal } from '../../components/SuccessSeal';
import { colors } from '../../theme/tokens';
import { useLocationStore } from '../../store/useLocationStore';
import { generateOrderId } from '../../utils/generateOrderId';
import { ReceiptCard } from './components/ReceiptCard';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'Receipt'>;

// expo-glass-effect's real iOS 26 Liquid Glass — Android and older iOS fall
// back to BlurView's light glass instead (see the button below). Checked
// once, not per-render — it can't change while the app is running.
const LIQUID_GLASS_AVAILABLE = isLiquidGlassAvailable();

export function ReceiptScreen({ navigation, route }: Props) {
  const { amount, items, paymentMethodLabel } = route.params;
  const [orderId] = useState(generateOrderId);
  const address = useLocationStore((s) => s.location?.addressLabel) ?? 'your saved address';
  const itemTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <View className="flex-1 bg-white pt-safe">
      <View className="flex-row items-center justify-between px-5 pt-2">
        <Pressable onPress={() => navigation.navigate('Home')} hitSlop={12} className="h-11 w-11 items-center justify-center">
          <AppIcon icon={Cancel01Icon} size={20} color={colors.ink} />
        </Pressable>
        <Text className="text-lg font-semibold text-ink">E-Receipt</Text>
        <Pressable hitSlop={12} className="h-11 w-11 items-center justify-center">
          <AppIcon icon={Download03Icon} size={20} color={colors.ink} />
        </Pressable>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="items-center gap-5 px-4 pb-6 pt-3">
        <SuccessSeal size={72} color={colors.success} />

        <View className="items-center gap-0">
          <Text className="text-xl font-medium text-ink">Order Confirmed!</Text>
          <Text className="text-center text-base text-ink/50">Thank you for shopping with Flikk.</Text>
        </View>

        <ReceiptCard
          orderId={orderId}
          paymentMethodLabel={paymentMethodLabel}
          deliveryAddress={address}
          items={items}
          itemTotal={itemTotal}
          total={amount}
        />
      </ScrollView>

      {/* No footer background — sits directly on the page. One horizontal
          row, equal-width buttons (flex-1 on both). Track Order is solid
          black; Continue Shopping is real Liquid Glass on iOS 26
          (GlassView), falling back to BlurView's light glass everywhere
          else — glass only applies to this one button, not Track Order. */}
      <View className="flex-row gap-3 px-5 pb-safe-offset-4 pt-4">
        <Pressable
          onPress={() => navigation.navigate('TrackOrder', { orderId, paymentMethodLabel })}
          className="flex-1 items-center rounded-2xl bg-black py-4"
        >
          <Text className="text-lg font-semibold text-white">Track Order</Text>
        </Pressable>

        <Pressable
          onPress={() => navigation.navigate('Home')}
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

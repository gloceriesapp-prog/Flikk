// Reached from CartScreen's "Checkout" button. "Pay now" requires a payment
// method to be picked first (button stays disabled until then), then opens
// PaymentProcessingSheet as a modal right over this screen — the actual
// Razorpay attempt lives there once it's wired. Once the sheet finishes
// (processing -> success), the cart is cleared and it hands off to
// screens/receipt/ReceiptScreen.tsx with a snapshot of what was ordered.

import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { selectCartGrandTotal, useCartStore } from '../../store/useCartStore';
import { CheckoutCartItems } from './components/CheckoutCartItems';
import { CheckoutFooter } from './components/CheckoutFooter';
import { CheckoutHeader } from './components/CheckoutHeader';
import { DeliveryAddressCard } from './components/DeliveryAddressCard';
import { PAYMENT_METHOD_LABEL, PaymentMethodCard, type PaymentMethod } from './components/PaymentMethodCard';
import { PaymentProcessingSheet } from './components/PaymentProcessingSheet';
import { RecommendedForYouRow } from './components/RecommendedForYouRow';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'Checkout'>;

export function CheckoutScreen({ navigation }: Props) {
  const items = useCartStore((state) => state.items);
  const grandTotal = useCartStore(selectCartGrandTotal);
  const clear = useCartStore((state) => state.clear);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  // Bumped on every "Pay now" tap — remounting PaymentProcessingSheet with a
  // fresh key gives it a clean phase/timers for each attempt without the
  // sheet needing to reset its own state via an effect (see its own comment).
  const [attemptKey, setAttemptKey] = useState(0);

  function handlePay() {
    if (!paymentMethod) return;
    setAttemptKey((k) => k + 1);
    setIsProcessing(true);
  }

  function handleComplete() {
    setIsProcessing(false);
    // Snapshot before clearing — Receipt reads items/amount/payment method
    // from route params, not live from the store, since the store is about
    // to empty and paymentMethod could change if the user taps around fast.
    const orderedItems = items;
    const orderedAmount = grandTotal;
    // paymentMethod is guaranteed non-null here — handlePay bails out
    // before this can ever run without one selected.
    const orderedPaymentMethodLabel = PAYMENT_METHOD_LABEL[paymentMethod!];
    clear();
    navigation.navigate('Receipt', {
      amount: orderedAmount,
      items: orderedItems,
      paymentMethodLabel: orderedPaymentMethodLabel,
    });
  }

  return (
    <View className="flex-1 bg-white pt-safe">
      <CheckoutHeader onBack={() => navigation.goBack()} onSearch={() => navigation.navigate('Search')} />

      <ScrollView className="flex-1" contentContainerClassName="gap-4 px-5 pb-6">
        <DeliveryAddressCard onPress={() => navigation.navigate('LocationSearch')} />
        <PaymentMethodCard method={paymentMethod} onSelect={setPaymentMethod} />

        <CheckoutCartItems items={items} onViewAll={() => navigation.navigate('Cart')} />

        <RecommendedForYouRow />
      </ScrollView>

      <CheckoutFooter
        totalPrice={grandTotal}
        onPay={handlePay}
        paymentMethodLabel={paymentMethod ? PAYMENT_METHOD_LABEL[paymentMethod] : null}
      />

      <PaymentProcessingSheet key={attemptKey} visible={isProcessing} onComplete={handleComplete} />
    </View>
  );
}

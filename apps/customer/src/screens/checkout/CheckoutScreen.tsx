// Reached from CartScreen's "Checkout" button. "Pay now" requires a payment
// method AND a real saved delivery address to be picked first (button
// stays disabled/blocked until both exist).
//
// Real order flow: tapping Pay now always creates a real order first
// (POST /orders — order + order_items rows). Cash on Delivery goes
// straight to Receipt with razorpay_payment_id left null.
//
// Online payment (real Razorpay Checkout SDK) is built but INTENTIONALLY
// NOT WIRED HERE — it needs a native dev-client build (react-native-
// razorpay isn't available in Expo Go), and this app is running in Expo
// Go for now. The real integration lives in api/payments.ts and
// payments/openRazorpayCheckout.ts untouched, ready to wire back in once
// an EAS dev-client build is actually needed. Selecting "Online" for now
// just shows a "coming soon" alert.
//
// The delivery address is a real saved one (api/addresses.ts,
// GET /addresses) — a first-time customer with no saved address gets
// steered into the real add-address flow (AddressListScreen/
// AddressFormScreen) instead of Pay being reachable at all; every order
// after that reuses the default address automatically with zero re-entry.
import { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createOrder } from '../../api/orders';
import { fetchAddresses } from '../../api/addresses';
import { ApiError } from '../../api/client';
import { selectCartGrandTotal, useCartStore } from '../../store/useCartStore';
import { CheckoutHeader } from './components/CheckoutHeader';
import { PAYMENT_METHOD_LABEL, PaymentMethodList, type PaymentMethod } from './components/PaymentMethodList';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'Checkout'>;

export function CheckoutScreen({ navigation }: Props) {
  const items = useCartStore((state) => state.items);
  const cartStoreId = useCartStore((state) => state.storeId);
  const grandTotal = useCartStore(selectCartGrandTotal);
  const clear = useCartStore((state) => state.clear);

  // Refetched every time this screen mounts — Checkout is reached fresh
  // from Cart each time, and the address book can have changed since
  // (a new one added, default switched) without any shared store to
  // invalidate otherwise.
  const { data: addresses } = useQuery({ queryKey: ['addresses'], queryFn: fetchAddresses });
  const selectedAddress = (addresses ?? []).find((a) => a.is_default) ?? addresses?.[0] ?? null;

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  function goToReceipt(order: { orderId: string; orderNumber: string; placedAt: string; avgPrepMinutes: number | null }, methodLabel: string) {
    // Snapshot before clearing — Receipt reads items/amount/payment method
    // from route params, not live from the store, since the store is about
    // to empty.
    const orderedItems = items;
    const orderedAmount = grandTotal;
    clear();
    navigation.navigate('Receipt', {
      orderId: order.orderId,
      orderNumber: order.orderNumber,
      amount: orderedAmount,
      items: orderedItems,
      paymentMethodLabel: methodLabel,
      placedAt: order.placedAt,
      avgPrepMinutes: order.avgPrepMinutes,
    });
  }

  async function handlePay() {
    if (!paymentMethod || isPlacingOrder) return;
    // items.length, not cartStoreId — an empty cart and a cart whose items
    // legitimately have an empty-string storeId (see useCartStore's own
    // addItem guard, which now refuses those adds outright) used to read
    // identically here since '' is falsy same as null. The real question
    // this check needs answered is "are there items", not "is storeId set".
    if (items.length === 0) {
      Alert.alert('Your cart is empty', 'Add something to your cart before checking out.');
      return;
    }
    if (!cartStoreId) {
      // Defensive only — addItem's own guard means this shouldn't be
      // reachable with a non-empty cart, but a real order can never be
      // placed without a real store id, so this stays as a hard stop
      // rather than trusting that invariant blindly.
      Alert.alert('Something went wrong', 'Could not tell which store this order belongs to. Please try again.');
      return;
    }
    if (!selectedAddress) {
      Alert.alert('Add a delivery address', 'Pick where this order should go before checking out.');
      navigation.navigate('AddressList');
      return;
    }
    if (paymentMethod !== 'cod') {
      Alert.alert('Coming soon', 'Online payments aren’t available yet — please pay Cash on Delivery for now.');
      return;
    }

    setIsPlacingOrder(true);
    try {
      const order = await createOrder({
        store_id: cartStoreId,
        address_id: selectedAddress.id,
        items: items.map((item) => ({ product_id: item.id, quantity: item.quantity })),
      });

      goToReceipt(
        { orderId: order.id, orderNumber: order.order_number, placedAt: order.placed_at, avgPrepMinutes: order.avg_prep_minutes ?? null },
        PAYMENT_METHOD_LABEL.cod
      );
    } catch (err) {
      Alert.alert('Could not place order', err instanceof ApiError ? err.message : 'Please try again.');
    } finally {
      setIsPlacingOrder(false);
    }
  }

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <CheckoutHeader onBack={() => navigation.goBack()} itemCount={items.length} total={grandTotal} />

      <ScrollView className="flex-1" contentContainerClassName="px-5 pb-8 pt-2">
        <PaymentMethodList
          method={paymentMethod}
          onSelect={setPaymentMethod}
          onPay={handlePay}
          totalPrice={grandTotal}
          isPlacingOrder={isPlacingOrder}
        />
      </ScrollView>
    </View>
  );
}

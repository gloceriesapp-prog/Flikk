// Reached from CartScreen's "Checkout" button. "Pay now" requires a payment
// method AND a real saved delivery address to be picked first (button
// stays disabled/blocked until both exist).
//
// Real order flow: tapping Pay now always creates a real order first
// (POST /orders — order + order_items rows). Cash on Delivery goes
// straight to Receipt with razorpay_payment_id left null.
//
// Online payment is the real Razorpay Checkout SDK (react-native-razorpay,
// payments/openRazorpayCheckout.ts) — needs the EAS dev-client build this
// app now ships (not Expo Go, which can't load native modules). That SDK
// is what actually shows the UPI intent app-picker (installed GPay/
// PhonePe/Paytm/etc, same as Blinkit/Meesho/Amazon) alongside cards,
// netbanking, and wallets — none of that is hand-built here, it's
// Razorpay's own native checkout UI. Flow: POST /orders creates the real
// order row first (source of truth for the amount — see api/payments.ts's
// own note, the amount is never trusted from the client), then POST
// /payments/create-order mints a Razorpay order for it, then the SDK
// opens, then POST /payments/verify re-derives the HMAC signature
// server-side before ever marking the order paid — a cancelled/failed
// checkout leaves the order row exactly as POST /orders left it
// (unpaid), same as it already does for the equivalent COD path below.
//
// The delivery address is a real saved one (api/addresses.ts,
// GET /addresses) — a first-time customer with no saved address gets
// steered into the real add-address flow (AddressListScreen/
// AddressFormScreen) instead of Pay being reachable at all; every order
// after that reuses the default address automatically with zero re-entry.
//
// A tapped UPI app (PaymentMethodList's own grid, `upi_app:<id>`) takes a
// third path alongside cod/online: POST /payments/create-upi-intent mints
// a real `upi://pay?...` link, payments/upiIntent.ts launches it directly
// at that specific installed app (no Razorpay-branded screen), then
// payments/pollOrderPaid.ts watches the order row for the webhook to mark
// it paid — that webhook (backend/src/routes/payments.ts) is the only
// thing that can ever actually mark an order paid, same as the 'online'
// path's POST /payments/verify below.
import { useEffect, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createOrder } from '../../api/orders';
import { fetchAddresses } from '../../api/addresses';
import { createRazorpayOrder, createUpiIntentPayment, verifyPayment } from '../../api/payments';
import { openRazorpayCheckout } from '../../payments/openRazorpayCheckout';
import { pollOrderPaid } from '../../payments/pollOrderPaid';
import type { UpiApp } from '../../payments/upiApps';
import { detectInstalledUpiApps, openUpiApp } from '../../payments/upiIntent';
import { selectCartGrandTotal, useCartStore } from '../../store/useCartStore';
import { useLocationStore } from '../../store/useLocationStore';
import { isOutsideOperatingHours, REOPEN_TIME_LABEL } from '../../utils/operatingHours';
import { CheckoutHeader } from './components/CheckoutHeader';
import { paymentMethodLabel, PaymentMethodList, type PaymentMethod } from './components/PaymentMethodList';
import { RewardPointsBanner } from './components/RewardPointsBanner';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'Checkout'>;

export function CheckoutScreen({ navigation }: Props) {
  const items = useCartStore((state) => state.items);
  const cartStoreId = useCartStore((state) => state.storeId);
  const grandTotal = useCartStore(selectCartGrandTotal);
  const clear = useCartStore((state) => state.clear);
  const recipientName = useLocationStore((state) => state.recipientName);

  // Refetched every time this screen mounts — Checkout is reached fresh
  // from Cart each time, and the address book can have changed since
  // (a new one added, default switched) without any shared store to
  // invalidate otherwise.
  const { data: addresses } = useQuery({ queryKey: ['addresses'], queryFn: fetchAddresses });
  const selectedAddress = (addresses ?? []).find((a) => a.is_default) ?? addresses?.[0] ?? null;

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [isAwaitingUpiConfirmation, setIsAwaitingUpiConfirmation] = useState(false);
  // The single source of truth for "which UPI apps are on this device" —
  // PaymentMethodList renders from this exact list, and handlePay below
  // looks the tapped app up in this exact list. Detecting independently
  // in both places (the previous version) risked disagreeing between two
  // separate detection calls — that mismatch was the actual "Unknown UPI
  // app selected" bug.
  const [upiApps, setUpiApps] = useState<UpiApp[]>([]);
  useEffect(() => {
    let cancelled = false;
    detectInstalledUpiApps().then((apps) => {
      if (!cancelled) setUpiApps(apps);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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
    // The one real enforcement point for the 10:30 PM–6:00 AM IST ordering
    // window (utils/operatingHours.ts) — Home's own header treatment
    // (HomeHeader's red gradient + LocationSelector's "Closed for now") is
    // just an announcement, browsing stays open there either way. This is
    // the actual hard stop: someone with a cart already built from before
    // closing time (or who just ignored the header) can't complete a real
    // order once the window has closed. Checked fresh on every tap, not
    // once at mount, so a checkout screen left open across the 9:30 cutover
    // still blocks correctly instead of trusting a stale render.
    if (isOutsideOperatingHours()) {
      Alert.alert('We’re closed for the night', `Orders reopen at ${REOPEN_TIME_LABEL} IST. Your cart is saved.`);
      return;
    }
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
    setIsPlacingOrder(true);
    try {
      const order = await createOrder({
        store_id: cartStoreId,
        address_id: selectedAddress.id,
        items: items.map((item) => ({ product_id: item.id, quantity: item.quantity })),
      });
      const orderSummary = {
        orderId: order.id,
        orderNumber: order.order_number,
        placedAt: order.placed_at,
        avgPrepMinutes: order.avg_prep_minutes ?? null,
      };

      if (paymentMethod === 'cod') {
        goToReceipt(orderSummary, paymentMethodLabel('cod', upiApps));
        return;
      }

      // Shared by the 'online' branch below and the upi_app branch's own
      // fallback — Razorpay's Standard Checkout SDK, which needs no
      // account feature beyond having Razorpay at all (unlike the S2S UPI
      // Intent call below, which needs that specific API enabled on the
      // account — see the upi_app branch's own note).
      async function payViaRazorpayCheckout() {
        const razorpayOrder = await createRazorpayOrder(order.id);
        const result = await openRazorpayCheckout({
          keyId: razorpayOrder.key_id,
          razorpayOrderId: razorpayOrder.id,
          amountPaise: razorpayOrder.amount,
          contact: null,
          name: recipientName,
        });
        await verifyPayment({
          orderId: order.id,
          razorpay_order_id: result.razorpay_order_id,
          razorpay_payment_id: result.razorpay_payment_id,
          razorpay_signature: result.razorpay_signature,
        });
      }

      if (paymentMethod.startsWith('upi_app:')) {
        const app = upiApps.find((a) => a.id === paymentMethod.slice('upi_app:'.length));
        // Can't happen from the UI (PaymentMethodList only ever emits an
        // id from this exact same upiApps list), but the type is a bare
        // string — narrow for real rather than a non-null assertion on a
        // payment path.
        if (!app) throw new Error('Unknown UPI app selected.');

        let upiLink: string;
        try {
          upiLink = (await createUpiIntentPayment(order.id)).upiLink;
        } catch {
          // The S2S UPI Intent API (backend's own note, payments/
          // createUpiIntent.ts) needs to be explicitly enabled on the
          // Razorpay account — a real account-activation gate, not a
          // code bug (confirmed directly against Razorpay's API: a
          // BAD_REQUEST_ERROR "requested URL was not found" for an
          // account without that feature turned on). Falling back to
          // Razorpay's own Standard Checkout keeps the customer paying
          // successfully via UPI either way — just through Razorpay's
          // bundled picker instead of this app's own grid — rather than
          // dead-ending on an error for something outside this code's
          // control.
          await payViaRazorpayCheckout();
          goToReceipt(orderSummary, paymentMethodLabel('online', upiApps));
          return;
        }

        await openUpiApp(app, upiLink);

        // Order already exists (unpaid) — if the customer never confirms
        // inside the app, or the poll below times out, it just stays
        // that way, same as every other path here that doesn't complete.
        setIsAwaitingUpiConfirmation(true);
        const paid = await pollOrderPaid(order.id);
        setIsAwaitingUpiConfirmation(false);

        if (!paid) {
          Alert.alert(
            'Still waiting for payment',
            `We haven't heard back from ${app.name} yet. If you completed the payment, it'll confirm shortly — otherwise you can try again.`,
          );
          return;
        }

        goToReceipt(orderSummary, app.name);
        return;
      }

      // 'online' — order row already exists (unpaid) at this point; a
      // cancelled or failed checkout below just leaves it that way, same
      // as every other path here. Nothing second-guesses which card/
      // netbanking/UPI-app-not-in-our-list the customer actually used —
      // that choice is entirely Razorpay's own native checkout UI.
      await payViaRazorpayCheckout();
      goToReceipt(orderSummary, paymentMethodLabel('online', upiApps));
    } catch (err) {
      Alert.alert('Could not place order', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setIsPlacingOrder(false);
      setIsAwaitingUpiConfirmation(false);
    }
  }

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <CheckoutHeader onBack={() => navigation.goBack()} itemCount={items.length} total={grandTotal} />
      <RewardPointsBanner totalPrice={grandTotal} />

      <ScrollView className="flex-1" contentContainerClassName="px-5 pb-8 pt-4">
        <PaymentMethodList
          method={paymentMethod}
          onSelect={setPaymentMethod}
          onPay={handlePay}
          totalPrice={grandTotal}
          isPlacingOrder={isPlacingOrder || isAwaitingUpiConfirmation}
          upiApps={upiApps}
        />
      </ScrollView>
    </View>
  );
}

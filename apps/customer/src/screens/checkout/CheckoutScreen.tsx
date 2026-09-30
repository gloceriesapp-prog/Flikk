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
// at that specific installed app (no Razorpay-branded screen), then this
// screen hands off to PaymentProcessingScreen, which owns the real wait —
// payments/pollOrderPaid.ts watches the order (or trip, for a multi-store
// checkout — same one-combined-payment model Standard Checkout already
// uses) row for the webhook to mark it paid — that webhook
// (backend/src/payments/webhook.ts) is the only thing that can ever
// actually mark an order paid, same as the 'online' path's POST
// /payments/verify below. Splitting one trip payment across N stores was
// never actually a payment-collection problem: each store already has
// its own real orders row with its own item_total/commission_amount
// (CLAUDE.md's single-store-per-order schema), regardless of which single
// payment flow collected the combined amount.
//
// 'upi_id' (PaymentMethodList's own typed-VPA row) takes a fourth path —
// only reachable after that row's own real verify-upi-id call already
// confirmed the typed VPA resolves to a real account (a genuine RazorpayX
// penny-drop, not a format guess). Verifying it doesn't let this skip
// anything: NPCI retired UPI Collect (payments/verifyUpiId.ts's own
// note), so there's still no way to push a request into that VPA's own
// app — this mints the exact same S2S UPI Intent link the app-grid does,
// then opens it with no specific package targeted (Linking.openURL,
// same as openUpiApp's own iOS branch), letting the OS pick the one
// installed app that owns the verified VPA, or show its own chooser if
// more than one could. Same PaymentProcessingScreen hand-off either way.
import { useEffect, useState } from 'react';
import { Alert, Linking, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createOrder } from '../../api/orders';
import { createTrip } from '../../api/trips';
import { fetchAddresses } from '../../api/addresses';
import { createRazorpayOrder, createUpiIntentPayment, verifyPayment } from '../../api/payments';
import { openRazorpayCheckout } from '../../payments/openRazorpayCheckout';
import type { UpiApp } from '../../payments/upiApps';
import { detectInstalledUpiApps, openUpiApp } from '../../payments/upiIntent';
import { calculateCartGrandTotal, selectCartStoreCount, selectCartTotalPrice, useCartStore } from '../../store/useCartStore';
import { DEFAULT_DELIVERY_SETTINGS, useDeliverySettings } from '../../api/deliverySettings';
import { useLocationStore } from '../../store/useLocationStore';
import { isOutsideOperatingHours, REOPEN_TIME_LABEL } from '../../utils/operatingHours';
import { CheckoutHeader } from './components/CheckoutHeader';
import { DeliveryAddressCard } from './components/DeliveryAddressCard';
import { paymentMethodLabel, PaymentMethodList, type PaymentMethod } from './components/PaymentMethodList';
import { TotalAmountCard } from './components/TotalAmountCard';
// RewardPointsBanner hidden — no real points ledger behind it yet
// (cosmetic-only "you're earning X points" copy), see this session's own
// explicit ask to pull it until real logic backs it. Not deleted —
// import { RewardPointsBanner } from './components/RewardPointsBanner';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'Checkout'>;

export function CheckoutScreen({ navigation }: Props) {
  const items = useCartStore((state) => state.items);
  const storeCount = useCartStore(selectCartStoreCount);
  // >1 store means checkout goes through POST /trips (one payment, one
  // delivery fee, one real order per store — useCartStore's own header
  // note) instead of the plain single-store POST /orders. The S2S UPI
  // Intent quick-pick grid is trip-aware too (createUpiIntent.ts/
  // webhook.ts/pollOrderPaid.ts's own notes) — one combined payment for
  // the whole trip, same as Standard Checkout already did; each store
  // still gets its own real item_total/commission_amount for payout
  // purposes off its own orders row regardless of which payment path
  // collected the money (CLAUDE.md: single-store-per-order at the schema
  // level even though the cart/payment fans out across stores).
  const isMultiStore = storeCount > 1;
  const itemTotal = useCartStore(selectCartTotalPrice);
  // Cart-level coupon (PromoCodeCard, useCartStore.appliedPromo) — the
  // code string is all POST /orders / POST /trips need; the discount
  // itself is always recomputed there from scratch (routes/promos.ts's
  // own note), never trusted from this earlier client-side apply.
  const appliedPromo = useCartStore((state) => state.appliedPromo);
  const promoCode = appliedPromo?.code;
  // Real, admin-editable delivery fee (api/deliverySettings.ts) — falls
  // back to the same default the migration seeds while the fetch is in
  // flight, never a blank/zero total.
  const { data: deliverySettings = DEFAULT_DELIVERY_SETTINGS } = useDeliverySettings();
  const grandTotal = calculateCartGrandTotal(itemTotal, appliedPromo?.discountAmount ?? 0, deliverySettings);
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
    // The real address this order was actually placed against (handlePay
    // already blocks Pay entirely when this is null, so it's real here) —
    // not ambient GPS/location-store state, which can drift from the
    // account's actual saved address.
    const orderedAddress = selectedAddress ? `${selectedAddress.label} · ${selectedAddress.line1}` : 'your saved address';
    clear();
    navigation.navigate('Receipt', {
      orderId: order.orderId,
      orderNumber: order.orderNumber,
      amount: orderedAmount,
      items: orderedItems,
      paymentMethodLabel: methodLabel,
      placedAt: order.placedAt,
      avgPrepMinutes: order.avgPrepMinutes,
      isTrip: isMultiStore,
      deliveryAddress: orderedAddress,
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
    if (!selectedAddress) {
      Alert.alert('Add a delivery address', 'Pick where this order should go before checking out.');
      navigation.navigate('AddressList');
      return;
    }
    setIsPlacingOrder(true);
    try {
      // Every non-cod method (a specific UPI app, the sample row, card —
      // Razorpay's own Standard Checkout already covers netbanking/
      // wallets inside itself, no separate method for those) all end up
      // actually charging through Razorpay one way or another — this is
      // the one real fork that matters for jobs/expireUnpaidOrders.ts's
      // own cleanup, not each method's own separate label.
      const intendedPaymentMethod: 'cod' | 'online' = paymentMethod === 'cod' ? 'cod' : 'online';

      // Exactly one of these two calls runs — a single-store cart keeps
      // using the plain, unaffected POST /orders path; a cart spanning
      // more than one store goes through POST /trips instead (one
      // payment, one delivery fee, one real order per store under the
      // hood — useCartStore's own header note on why).
      const paymentRecord = isMultiStore
        ? await createTrip({
            address_id: selectedAddress.id,
            items: items.map((item) => ({ product_id: item.id, quantity: item.quantity })),
            promo_code: promoCode,
            payment_method: intendedPaymentMethod,
          })
        : await createOrder({
            store_id: items[0]!.storeId,
            address_id: selectedAddress.id,
            items: items.map((item) => ({ product_id: item.id, quantity: item.quantity })),
            promo_code: promoCode,
            payment_method: intendedPaymentMethod,
          });

      const orderSummary = isMultiStore
        ? {
            orderId: paymentRecord.id,
            // Trips have no real order_number of their own (that's a
            // per-store-order thing) — a short id-based label is honest
            // about what this actually is rather than borrowing one leg's
            // real order_number as if it spoke for the whole trip.
            orderNumber: `TRIP-${paymentRecord.id.slice(0, 6).toUpperCase()}`,
            placedAt: (paymentRecord as { created_at: string }).created_at,
            // No single store to source an ETA from at the trip level —
            // ReceiptScreen already falls back to a generic estimate when
            // this is null, same as any single-store order whose own
            // avg_prep_minutes lookup failed.
            avgPrepMinutes: null,
          }
        : {
            orderId: paymentRecord.id,
            orderNumber: (paymentRecord as { order_number: string }).order_number,
            placedAt: (paymentRecord as { placed_at: string }).placed_at,
            avgPrepMinutes: (paymentRecord as { avg_prep_minutes?: number | null }).avg_prep_minutes ?? null,
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
        const razorpayOrder = await createRazorpayOrder(
          isMultiStore ? { tripId: paymentRecord.id } : { orderId: paymentRecord.id },
        );
        const result = await openRazorpayCheckout({
          keyId: razorpayOrder.key_id,
          razorpayOrderId: razorpayOrder.id,
          amountPaise: razorpayOrder.amount,
          contact: null,
          name: recipientName,
        });
        await verifyPayment({
          ...(isMultiStore ? { tripId: paymentRecord.id } : { orderId: paymentRecord.id }),
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

        const intentTarget = isMultiStore ? { tripId: paymentRecord.id } : { orderId: paymentRecord.id };

        let upiLink: string;
        try {
          upiLink = (await createUpiIntentPayment(intentTarget)).upiLink;
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

        // Deliberately NOT awaited — on Android, expo-intent-launcher's
        // startActivityAsync runs the launched app via
        // startActivityForResult, so its promise only resolves once THAT
        // activity finishes (the customer backs out of / cancels GPay).
        // Awaiting it here used to block this whole function until then,
        // which is exactly why PaymentProcessing never showed until the
        // customer cancelled — this screen needs to be up and polling
        // BEFORE the app switch, not after it returns. Nothing here reads
        // this promise's result anyway; payments/pollOrderPaid.ts's real
        // webhook-backed poll is the only thing that decides the outcome.
        openUpiApp(app, upiLink).catch(() => {});

        // Order already exists (unpaid) at this point — PaymentProcessingScreen
        // owns everything from here: the real wait for webhook confirmation
        // (payments/pollOrderPaid.ts), the countdown, and the hand-off to
        // either Receipt (confirmed paid) or PaymentStatus (timeout). Cart
        // stays uncleared until that screen confirms success, not here.
        navigation.navigate('PaymentProcessing', {
          target: intentTarget,
          appName: app.name,
          amount: grandTotal,
          order: orderSummary,
          items,
          deliveryAddress: selectedAddress ? `${selectedAddress.label} · ${selectedAddress.line1}` : 'your saved address',
          isTrip: isMultiStore,
        });
        return;
      }

      if (paymentMethod === 'upi_id') {
        // Reaching here at all means PaymentMethodList's own verify-upi-id
        // call already succeeded — this branch never runs the Fund
        // Account Validation itself, that already happened before Pay Now
        // was even shown. No package/component targeted (unlike the
        // upi_app branch above) — a typed VPA doesn't say which installed
        // app owns it, so Linking.openURL here lets the OS resolve it:
        // opens directly if exactly one app matches, its own native
        // chooser if several do. That's the honest behavior for this
        // specific case, not the bug the upi_app branch had to fix.
        const intentTarget = isMultiStore ? { tripId: paymentRecord.id } : { orderId: paymentRecord.id };

        let upiLink: string;
        try {
          upiLink = (await createUpiIntentPayment(intentTarget)).upiLink;
        } catch {
          // Same real account-activation gate the upi_app branch's own
          // note documents — falls back to Standard Checkout rather than
          // dead-ending on something outside this code's control.
          await payViaRazorpayCheckout();
          goToReceipt(orderSummary, paymentMethodLabel('online', upiApps));
          return;
        }

        await Linking.openURL(upiLink);

        navigation.navigate('PaymentProcessing', {
          target: intentTarget,
          appName: 'your UPI app',
          amount: grandTotal,
          order: orderSummary,
          items,
          deliveryAddress: selectedAddress ? `${selectedAddress.label} · ${selectedAddress.line1}` : 'your saved address',
          isTrip: isMultiStore,
        });
        return;
      }

      // 'online' and 'card' both land here — order row already exists
      // (unpaid) at this point; a cancelled or failed checkout below just
      // leaves it that way, same as every other path here. Both go
      // through Razorpay's own Standard Checkout.
      await payViaRazorpayCheckout();
      goToReceipt(orderSummary, paymentMethodLabel(paymentMethod, upiApps));
    } catch (err) {
      Alert.alert('Could not place order', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setIsPlacingOrder(false);
    }
  }

  return (
    <View className="flex-1 bg-[#F2F2F7]">
      <CheckoutHeader onBack={() => navigation.goBack()} itemCount={items.length} total={grandTotal} />
      {/* <RewardPointsBanner totalPrice={grandTotal} /> */}

      {/* Only the header above stays fixed — TotalAmountCard used to sit
          outside this scroll view (visually "stuck" under the header,
          per an explicit ask that it shouldn't be) and now scrolls away
          with everything else instead. KeyboardAwareScrollView left in
          place even though the one text input that needed it ("Pay via
          UPI ID", since removed — PaymentMethodList.tsx's own note) is
          gone — harmless no-op without a focused field, and keeps this
          screen ready if a future input ever needs the same
          scroll-above-keyboard behavior AddressFormScreen's own note
          documents. */}
      <KeyboardAwareScrollView className="flex-1" contentContainerClassName="gap-3 px-5 pb-8 pt-4" bottomOffset={40}>
        <DeliveryAddressCard address={selectedAddress} onChange={() => navigation.navigate('LocationSearch', { intent: 'address-book' })} />

        <TotalAmountCard items={items} totalPrice={grandTotal} />

        <PaymentMethodList
          method={paymentMethod}
          onSelect={setPaymentMethod}
          onPay={handlePay}
          totalPrice={grandTotal}
          isPlacingOrder={isPlacingOrder}
          // Real detected list regardless of cart size now — the UPI-app
          // grid is trip-aware (this screen's own note on isMultiStore).
          upiApps={upiApps}
        />
      </KeyboardAwareScrollView>
    </View>
  );
}

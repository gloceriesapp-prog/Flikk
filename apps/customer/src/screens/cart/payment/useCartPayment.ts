import { readAttempt, closeSavedAttempt, saveAttempt, clearAttempt, clearCommittedAttempt, newAttemptId, findAttempt, attemptTarget } from '../../../features/checkout-recovery/attemptStorage';
// Cart owns order placement; the payment picker only returns a selection.
// See ../README.md for confirmation, persistence and navigation flows.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CheckoutQuote } from '../../../api/checkout';
import { fetchCheckoutQuote } from '../../../api/checkout';
import { quotedCartItems, quoteHasPriceChanges } from '../quote/quoteItems';
import type { CartItem } from '../../../store/useCartStore';
import { checkoutItems, cartPurchaseSignature } from '../../../store/cartIdentity';
import { Alert } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createOrder } from '../../../api/orders';
import { createTrip } from '../../../api/trips';
import type { ApiAddress } from '../../../api/addresses';
import { useAuthStore } from '../../../store/useAuthStore';
import { fetchPendingPayments, recoverPayment, createPaymentOrder, createUpiIntentPayment, createUpiCollectPayment, verifyPayment, fetchPaymentPreference, rememberPaymentMethod } from '../../../api/payments';
import { openCashfreeCheckout } from '../../../payments/openCashfreeCheckout';
import type { UpiApp } from '../../../payments/upiApps';
import { canLaunchUpiApp, detectInstalledUpiApps, openUpiApp } from '../../../payments/upiIntent';
import { keepsCheckoutAttempt } from './attemptPolicy';
import { selectCartStoreCount, useCartStore } from '../../../store/useCartStore';
import { isOutsideOperatingHours, REOPEN_TIME_LABEL } from '../../../utils/operatingHours';
import { availablePaymentMethod, paymentMethodLabel, type PaymentMethod } from '../../../payments/paymentMethod';
import type { AppStackParamList } from '../../../navigation/types';

interface Props {
  navigation: NativeStackScreenProps<AppStackParamList, 'Cart'>['navigation'];
  selectedAddress: ApiAddress | null;
  quote?: CheckoutQuote;
  onQuoteChanged: () => void;
  selectedPaymentMethod?: PaymentMethod;
  // Verified UPI ID for 'upi_id' (PaymentMethod screen). Navigation state only.
  upiVpa?: string;
}

export function useCartPayment({ navigation, selectedAddress, selectedPaymentMethod, upiVpa, quote, onQuoteChanged }: Props) {
  const items = useCartStore((state) => state.items);
  const storeCount = useCartStore(selectCartStoreCount);
  const isMultiStore = storeCount > 1;
  const appliedPromo = useCartStore((state) => state.appliedPromo);
  const promoCode = appliedPromo?.code;
  const grandTotal = quote?.bill.total ?? null;
  const clear = useCartStore((state) => state.clear);

  const accessToken = useAuthStore((state) => state.accessToken);
  const [savedMethod, setSavedMethod] = useState<PaymentMethod | null>(null);
  const [methodsReady, setMethodsReady] = useState(false);
  const placingOrder = useRef(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [upiApps, setUpiApps] = useState<UpiApp[]>([]);
  useEffect(() => {
    let cancelled = false;
    detectInstalledUpiApps().catch(() => [] as UpiApp[]).then((apps) => {
      if (cancelled) return;
      setUpiApps(apps);
      setMethodsReady(true);
    });
    if (accessToken) fetchPaymentPreference().then((preference) => {
      if (!cancelled) setSavedMethod(preference.method);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [accessToken]);
  const ownerEpoch = useRef(useAuthStore.getState().sessionEpoch).current;
  const stillOwner = () => useAuthStore.getState().sessionEpoch === ownerEpoch;
  const chosenMethod = selectedPaymentMethod;
  const paymentMethod = availablePaymentMethod(chosenMethod ?? savedMethod, upiApps, !!upiVpa);
  const latestSelection = useRef({ addressId: selectedAddress?.id, paymentMethod });
  useLayoutEffect(() => {
    latestSelection.current = { addressId: selectedAddress?.id, paymentMethod };
  }, [selectedAddress?.id, paymentMethod]);
  const choosePayment = () => navigation.navigate('PaymentMethod', { selectedMethod: paymentMethod, upiVpa });

  async function goToReceipt(order: { orderId: string; orderNumber: string; placedAt: string; avgPrepMinutes: number | null; estimatedDeliveryMinutes?: number | null; estimatedDeliveryAt?: string | null; amount: number; items: CartItem[] }, methodLabel: string, successfulMethod: PaymentMethod) {
    if (!stillOwner()) return;
    const orderedItems = order.items;
    const orderedAmount = order.amount;
    const orderedAddress = selectedAddress ? `${selectedAddress.label} · ${selectedAddress.line1}` : 'your saved address';
    void rememberPaymentMethod(successfulMethod, isMultiStore ? { tripId: order.orderId } : { orderId: order.orderId }).catch(() => {});
    await clearCommittedAttempt(isMultiStore ? { tripId: order.orderId } : { orderId: order.orderId });
    if (!stillOwner()) return;
    if (cartPurchaseSignature(useCartStore.getState().items) === cartPurchaseSignature(orderedItems)) clear();
    navigation.navigate('Receipt', {
      orderId: order.orderId,
      orderNumber: order.orderNumber,
      amount: orderedAmount,
      items: orderedItems,
      paymentMethodLabel: methodLabel,
      placedAt: order.placedAt,
      avgPrepMinutes: order.avgPrepMinutes,
      estimatedDeliveryMinutes: order.estimatedDeliveryMinutes,
      estimatedDeliveryAt: order.estimatedDeliveryAt,
      isTrip: isMultiStore,
      deliveryAddress: orderedAddress,
    });
  }

  async function handlePay() {
    if (!stillOwner() || !paymentMethod || placingOrder.current || !methodsReady || !quote) return;
    if (!accessToken) { useAuthStore.getState().exitGuestMode(); return; }
    if (isOutsideOperatingHours()) {
      Alert.alert('We’re closed for the night', `Orders reopen at ${REOPEN_TIME_LABEL} IST. Your cart is saved.`);
      return;
    }
    if (items.length === 0) {
      Alert.alert('Your cart is empty', 'Add something to your cart before checking out.');
      return;
    }
    if (!selectedAddress) {
      Alert.alert('Add a delivery address', 'Pick where this order should go before checking out.');
      navigation.navigate('AddressList');
      return;
    }
    placingOrder.current = true;
    setIsPlacingOrder(true);
    try {
      const cartKey = JSON.stringify({ items: checkoutItems(items), promo: promoCode ?? null });
      let saved = await readAttempt();
      if (saved) {
        const committed = await findAttempt(saved.id);
        if (committed?.result) {
          navigation.navigate('PaymentRecovery', { target: attemptTarget({ ...committed, result: committed.result! }) });
          return;
        }
        if (saved.cartKey !== cartKey || saved.input.address_id !== selectedAddress.id
          || saved.input.payment_method !== (paymentMethod === 'cod' ? 'cod' : 'online') || saved.kind !== (isMultiStore ? 'trip' : 'order')) {
          // The cart changed since an uncertain attempt. Close it server-side
          // (atomic with creation): either the old request already committed
          // (recover THAT order) or it is fenced forever and this cart starts
          // a fresh attempt. Never replay the old cart.
          const closed = await closeSavedAttempt(saved);
          if (closed.result) {
            navigation.navigate('PaymentRecovery', { target: attemptTarget({ ...closed, result: closed.result }) });
            return;
          }
          await clearAttempt(saved.id);
          saved = null;
        }
      }
      const pending = await fetchPendingPayments();
      if (pending[0]) {
        navigation.navigate('PaymentRecovery', { target: pending[0] });
        return;
      }
      // Always recheck before creation. An alert is explicit consent; cancelling
      // refreshes the bill without placing an order or starting payment.
      const input = checkoutItems(items);
      const freshQuote = await fetchCheckoutQuote(input, promoCode, selectedAddress.id);
      onQuoteChanged();
      if (freshQuote.version !== quote.version || quoteHasPriceChanges(items, freshQuote)) {
        const changes = freshQuote.items.flatMap((line) => {
          const source = items.find((item) => (item.productId ?? item.id.split('::')[0]) === line.product_id
            && (!item.variantId || item.variantId === line.variant_id));
          return source && source.price !== line.unit_price_at_order
            ? [`${source.name}: ₹${source.price} → ₹${line.unit_price_at_order}`] : [];
        }).slice(0, 5);
        const confirmed = await new Promise<boolean>((resolve) => Alert.alert('Review your updated bill',
          `${changes.length ? changes.join('\n') + '\n\n' : ''}Total payable: ₹${freshQuote.bill.total.toFixed(2)}. Continue with these prices and fees?`,
          [{ text: 'Review cart', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Confirm and order', onPress: () => resolve(true) }],
          { cancelable: true, onDismiss: () => resolve(false) }));
        if (!confirmed) return;
      }
      // Cart/address changes while a request or confirmation is pending
      // invalidate this attempt rather than ordering an earlier selection.
      if (JSON.stringify(checkoutItems(useCartStore.getState().items)) !== JSON.stringify(input)
        || useCartStore.getState().appliedPromo?.code !== promoCode
        || latestSelection.current.addressId !== selectedAddress.id
        || latestSelection.current.paymentMethod !== paymentMethod) {
        throw new Error('Your cart changed. Review it before ordering.');
      }
      if (!stillOwner()) return;
      const orderedItems = quotedCartItems(items, freshQuote);
      const intendedPaymentMethod: 'cod' | 'online' = paymentMethod === 'cod' ? 'cod' : 'online';

      const attemptId = saved?.id ?? await newAttemptId();
      if (!stillOwner()) return;
      const common = { attempt_id: attemptId, address_id: selectedAddress.id, items: checkoutItems(orderedItems),
        quote_token: freshQuote.token, promo_code: promoCode, payment_method: intendedPaymentMethod };
      const orderInput = { ...common, store_id: items[0]!.storeId };
      // Await durable persistence BEFORE submitting the order request.
      await saveAttempt({ id: attemptId, kind: isMultiStore ? 'trip' : 'order',
        input: isMultiStore ? common : orderInput, cartKey });
      if (!stillOwner()) return;
      const paymentRecord = isMultiStore ? await createTrip(common) : await createOrder(orderInput);

      const confirmedAmount = Number(paymentRecord.total);
      if (confirmedAmount !== freshQuote.bill.total) throw new Error('The order total could not be verified. Contact support before paying.');
      const orderSummary = isMultiStore
        ? {
            orderId: paymentRecord.id,
            amount: confirmedAmount,
            items: orderedItems,
            estimatedDeliveryMinutes: paymentRecord.estimated_delivery_minutes,
            estimatedDeliveryAt: paymentRecord.estimated_delivery_at,
            orderNumber: `TRIP-${paymentRecord.id.slice(0, 6).toUpperCase()}`,
            placedAt: (paymentRecord as { created_at: string }).created_at,
            avgPrepMinutes: null,
          }
        : {
            orderId: paymentRecord.id,
            amount: confirmedAmount,
            items: orderedItems,
            estimatedDeliveryMinutes: paymentRecord.estimated_delivery_minutes,
            estimatedDeliveryAt: paymentRecord.estimated_delivery_at,
            orderNumber: (paymentRecord as { order_number: string }).order_number,
            placedAt: (paymentRecord as { placed_at: string }).placed_at,
            avgPrepMinutes: (paymentRecord as { avg_prep_minutes?: number | null }).avg_prep_minutes ?? null,
          };

      if (paymentMethod === 'cod') {
        await goToReceipt(orderSummary, 'Cash on Delivery', 'cod');
        return;
      }

      const payTarget = isMultiStore ? { tripId: paymentRecord.id } : { orderId: paymentRecord.id };
      const deliveryAddress = selectedAddress ? `${selectedAddress.label} · ${selectedAddress.line1}` : 'your saved address';
      const toProcessing = (appName: string, collect?: { vpa: string; expiresAt: string | null }) => navigation.navigate('PaymentProcessing', {
        target: payTarget, appName, paymentMethod, amount: confirmedAmount, order: orderSummary,
        items: orderedItems, deliveryAddress, isTrip: isMultiStore, collect,
      });

      // Card / netbanking / anything else, and every UPI fallback. onVerify
      // only means the hosted checkout closed; the server re-fetches Cashfree.
      // Not confirmed yet → the processing screen keeps polling.
      async function payViaCashfreeCheckout(label: string) {
        const order = await createPaymentOrder(payTarget);
        if (!stillOwner()) throw new Error('Session changed.');
        await openCashfreeCheckout(order);
        if (!stillOwner()) throw new Error('Session changed.');
        const verified = await verifyPayment(payTarget).catch(() => ({ ok: false }));
        if (!stillOwner()) return;
        if (verified.ok) await goToReceipt(orderSummary, label, paymentMethod!);
        else toProcessing(label);
      }

      if (paymentMethod === 'upi_id') {
        if (!upiVpa) throw new Error('Verify your UPI ID before paying.');
        const collect = await createUpiCollectPayment(payTarget, upiVpa);
        if (!stillOwner()) return;
        toProcessing('UPI ID', { vpa: upiVpa, expiresAt: collect.expiresAt ?? null });
        return;
      }

      const upiApp = paymentMethod.startsWith('upi_app:') ? upiApps.find((a) => a.id === paymentMethod.slice('upi_app:'.length)) : undefined;
      if (paymentMethod.startsWith('upi_app:') && !upiApp) throw new Error('This UPI app is no longer available. Please choose another payment method.');
      // An app whose scheme cannot open goes straight to Cashfree checkout,
      // BEFORE any intent payment is created (see canLaunchUpiApp).
      if (upiApp && await canLaunchUpiApp(upiApp)) {
        const { links } = await createUpiIntentPayment(payTarget, upiApp.id);
        if (!stillOwner()) return;
        // Launch, then poll from the processing screen; returning to the
        // foreground triggers an immediate status check (pollOrderPaid).
        if (await openUpiApp(upiApp, links)) {
          toProcessing(upiApp.name);
          return;
        }
      }

      await payViaCashfreeCheckout(paymentMethod === 'online' || upiApp ? 'Online payment' : paymentMethodLabel(paymentMethod, upiApps));
    } catch (err) {
      if (!stillOwner()) return;
      // A lost create/payment response keeps the attempt durable. Never
      // advertise a brand-new order while this result remains uncertain.
      try {
        const saved = await readAttempt();
        const committed = saved ? await findAttempt(saved.id) : null;
        if (saved && !committed?.result && !keepsCheckoutAttempt(err)) {
          // Definitive rejection: nothing committed. Fence and drop the key so
          // the next tap builds a fresh attempt from the current cart.
          try {
            const closed = await closeSavedAttempt(saved);
            if (closed.result) { navigation.navigate('PaymentRecovery', { target: attemptTarget({ ...closed, result: closed.result }) }); return; }
          } catch (closeErr) {
            // ATTEMPT_CONFLICT etc.: the key is unusable for this cart anyway.
            if (keepsCheckoutAttempt(closeErr)) throw closeErr;
          }
          await clearAttempt(saved.id);
        }
        if (committed?.result) {
          const target = attemptTarget({ ...committed, result: committed.result! });
          await recoverPayment(target);
          navigation.navigate('PaymentRecovery', { target });
          return;
        }
      } catch { /* Retain the attempt for the next authenticated retry. */ }
      onQuoteChanged();
      Alert.alert('Could not place order', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      placingOrder.current = false;
      setIsPlacingOrder(false);
    }
  }

  return { paymentMethod, upiApps, grandTotal, isPlacingOrder, methodsReady, choosePayment, placeOrder: handlePay };
}

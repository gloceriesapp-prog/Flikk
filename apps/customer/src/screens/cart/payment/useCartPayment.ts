import { readAttempt, closeSavedAttempt, saveAttempt, clearAttempt, clearCommittedAttempt, newAttemptId, findAttempt, attemptTarget } from '../../../features/checkout-recovery/attemptStorage';
import { beginCheckoutFlow } from '../../../features/checkout-recovery/checkoutActivity';
// Cart owns order placement; an explicit UPI selection requests one checkout.
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
import { fetchAvailableWallets, fetchNetbankingBanks, fetchPendingPayments, recoverPayment, createPaymentOrder, verifyPayment, fetchPaymentPreference, rememberPaymentMethod, fetchPaymentContact } from '../../../api/payments';
import { openRazorpayCheckout } from '../../../payments/openRazorpayCheckout';
import { assertDirectUpiConfigured, prepareUpiIntent } from '../../../payments/upiIntent';
import type { UpiApp } from '../../../payments/upiApps';
import { detectInstalledUpiApps } from '../../../payments/installedUpiApps';
import { keepsCheckoutAttempt } from './attemptPolicy';
import { selectCartStoreCount, useCartStore } from '../../../store/useCartStore';
import { formatIstMinute, isOutsideOperatingHours } from '../../../utils/operatingHours';
import { useOrderingHours } from '../../../utils/useOperatingHours';
import { availablePaymentMethod, type PaymentMethod } from '../../../payments/paymentMethod';
import { usePaymentAvailability } from '../../../payments/usePaymentAvailability';
import type { AppStackParamList } from '../../../navigation/types';

interface Props {
  navigation: NativeStackScreenProps<AppStackParamList, 'Cart'>['navigation'];
  selectedAddress: ApiAddress | null;
  quote?: CheckoutQuote;
  onQuoteChanged: () => void;
  selectedPaymentMethod?: PaymentMethod;
  selectedWallet?: import('../../../payments/paymentMethod').WalletSelection;
  selectedNetbankingBank?: import('../../../api/payments').NetbankingBank;
}

export function useCartPayment({ navigation, selectedAddress, selectedPaymentMethod, selectedWallet, selectedNetbankingBank, quote, onQuoteChanged }: Props) {
  const items = useCartStore((state) => state.items);
  const orderingHours = useOrderingHours();
  const storeCount = useCartStore(selectCartStoreCount);
  const isMultiStore = storeCount > 1;
  const appliedPromo = useCartStore((state) => state.appliedPromo);
  const promoCode = appliedPromo?.code;
  const grandTotal = quote?.bill.total ?? null;
  const clear = useCartStore((state) => state.clear);

  const accessToken = useAuthStore((state) => state.accessToken);
  const [methodState, setMethodState] = useState<{ token: string | null; method: PaymentMethod | null; apps: UpiApp[] } | null>(null);
  const methodsReady = methodState !== null && methodState.token === accessToken;
  const savedMethod = methodsReady ? methodState.method : null;
  const upiApps = methodsReady ? methodState.apps : [];
  const placingOrder = useRef(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const preference = accessToken ? fetchPaymentPreference().catch(() => ({ method: null })) : Promise.resolve({ method: null });
    Promise.all([detectInstalledUpiApps().catch(() => [] as UpiApp[]), preference]).then(([apps, saved]) => {
      if (cancelled) return;
      setMethodState({ token: accessToken, method: saved.method, apps });
    });
    return () => { cancelled = true; };
  }, [accessToken]);
  const ownerEpoch = useRef(useAuthStore.getState().sessionEpoch).current;
  const stillOwner = () => useAuthStore.getState().sessionEpoch === ownerEpoch;
  const chosenMethod = selectedPaymentMethod;
  // A method admin switched off is dropped, so the cart asks for another one.
  const { allowed } = usePaymentAvailability();
  const paymentMethod = availablePaymentMethod(chosenMethod ?? savedMethod, upiApps, allowed);
  const latestSelection = useRef({ addressId: selectedAddress?.id, paymentMethod, bankCode: selectedNetbankingBank?.code, walletContact: selectedWallet?.contact });
  useLayoutEffect(() => {
    latestSelection.current = { addressId: selectedAddress?.id, paymentMethod, bankCode: selectedNetbankingBank?.code, walletContact: selectedWallet?.contact };
  }, [selectedAddress?.id, paymentMethod, selectedNetbankingBank?.code, selectedWallet?.contact]);
  const choosePayment = () => navigation.navigate('PaymentMethod', { selectedMethod: paymentMethod, selectedNetbankingBank: paymentMethod === 'netbanking' ? selectedNetbankingBank : undefined, selectedAddressId: selectedAddress?.id });

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
    if (isOutsideOperatingHours(orderingHours)) {
      Alert.alert('We’re closed right now', `Orders reopen at ${formatIstMinute(orderingHours.opensMinute)} IST. Your cart is saved.`);
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
    const endCheckoutFlow = beginCheckoutFlow();
    try {
      if (paymentMethod.startsWith('wallet:')) {
        if (selectedWallet?.method === paymentMethod && !/^\+91[6-9]\d{9}$/.test(selectedWallet.contact)) {
          throw new Error('Enter a valid wallet mobile number in payment methods.');
        }
        const { wallets } = await fetchAvailableWallets();
        if (!stillOwner()) return;
        if (!wallets.some(wallet => `wallet:${wallet.code}` === paymentMethod)) {
          throw new Error('This wallet is unavailable. Choose another payment method.');
        }
      }
      if (paymentMethod === 'netbanking' && selectedNetbankingBank) {
        const { banks } = await fetchNetbankingBanks();
        if (!stillOwner()) return;
        if (!banks.some(bank => bank.code === selectedNetbankingBank.code)) {
          throw new Error('This bank is no longer available. Choose another bank in payment methods.');
        }
      }
      if (paymentMethod.startsWith('upi_app:')) {
        await assertDirectUpiConfigured(paymentMethod);
        if (!stillOwner()) return;
        const contact = await fetchPaymentContact();
        if (!stillOwner()) return;
        if (!contact.email) throw new Error('Razorpay requires a saved account email for direct UPI payments. Choose another payment method or contact support.');
      }
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
        || latestSelection.current.paymentMethod !== paymentMethod
        || latestSelection.current.bankCode !== selectedNetbankingBank?.code
        || latestSelection.current.walletContact !== selectedWallet?.contact) {
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
      // Compare in paise, not raw rupee floats — the persisted order/trip total
      // and the quote total are JSON floats that can differ by a sub-paisa
      // representation error (most likely on the multi-store trip path, where
      // the total is summed from per-leg fees). A strict !== there would throw
      // a false "contact support" on a legitimately-created order.
      if (Math.round(confirmedAmount * 100) !== Math.round(freshQuote.bill.total * 100)) throw new Error('The order total could not be verified. Contact support before paying.');
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
      if (paymentMethod.startsWith('upi_app:')) {
        const session = await prepareUpiIntent(payTarget, paymentMethod);
        if (!stillOwner()) return;
        if (session.amountPaise !== Math.round(confirmedAmount * 100)) throw new Error('The UPI amount does not match your order.');
        navigation.navigate('PaymentProcessing', {
          target: payTarget, appName: upiApps.find(app => paymentMethod === `upi_app:${app.id}`)?.name ?? 'your UPI app',
          paymentMethod, amount: confirmedAmount, order: orderSummary, items: orderedItems,
          deliveryAddress, isTrip: isMultiStore, expiresAt: session.expiresAt, upiIntent: session,
        });
        return;
      }
      // The SDK owns UPI app hand-off, card entry and bank selection. Its
      // callback is never enough to show a receipt: verify captured state.
      const providerOrder = await createPaymentOrder(payTarget);
      if (!stillOwner()) return;
      // Customers can change methods inside secure checkout, so the receipt
      // must not falsely claim that a preferred UPI app/card actually charged.
      const label = 'Online payment';
      const result = await openRazorpayCheckout(providerOrder, paymentMethod, paymentMethod === 'netbanking' ? selectedNetbankingBank : undefined, selectedWallet?.method === paymentMethod ? selectedWallet.contact : undefined);
      if (!stillOwner()) return;
      const verified = await verifyPayment(payTarget, result).catch(() => ({ ok: false }));
      if (!stillOwner()) return;
      if (verified.ok) await goToReceipt(orderSummary, label, paymentMethod);
      else navigation.navigate('PaymentProcessing', {
        target: payTarget, appName: 'your payment provider', paymentMethod,
        amount: confirmedAmount, order: orderSummary, items: orderedItems,
        deliveryAddress, isTrip: isMultiStore, expiresAt: providerOrder.expiresAt,
      });
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
      endCheckoutFlow();
      placingOrder.current = false;
      setIsPlacingOrder(false);
    }
  }

  return { paymentMethod, upiApps, grandTotal, isPlacingOrder, methodsReady, choosePayment, placeOrder: handlePay };
}

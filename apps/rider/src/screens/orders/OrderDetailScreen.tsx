// Full detail for one active delivery — pickup/drop route, a real step
// progress bar, a "Navigate to customer" button that drops straight into
// an in-app full-screen map (DeliveryMapView, real live GPS — CLAUDE.md's
// rider-app exception to the customer-app's status-only tracking scope),
// and the delivery-proof OTP step before the order can actually be marked
// delivered.
//
// The assigned -> picked_up transition is the one action that uses
// SlideToConfirmButton instead of a tap — that's the "I've got the order,
// heading out" moment, worth a deliberate gesture rather than an
// easy-to-mis-tap button, same reasoning apps/partner's own slide button
// applies to "mark order done." Every other step transition stays a plain
// tap (arriving somewhere isn't a moment that benefits from friction).
//
// No customer-facing "out for delivery" push/rating-popup triggered from
// here directly — already handled server-side (backend/src/routes/
// orders.ts sends the customer's own push the instant this screen's real
// PATCH /orders/:id/status call lands), not something this screen needs
// to fire itself.

import { useState } from 'react';
import { ArrowLeft01Icon, Call02Icon, Navigation03Icon, PackageIcon, Store01Icon } from '@hugeicons/core-free-icons';
import { Alert, Image, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/AppIcon';
import { CollectCashBanner } from '../../components/CollectCashBanner';
import { SlideToConfirmButton } from '../../components/SlideToConfirmButton';
import { colors, shadow } from '../../theme/tokens';
import { useRiderOrdersStore } from '../../store/useRiderOrdersStore';
import { DeliveryOtpModal } from './components/DeliveryOtpModal';
import { CancelOrderModal } from './components/CancelOrderModal';
import { DeliveryFailureModal } from './components/DeliveryFailureModal';
import { DeliveryMapView } from './components/DeliveryMapView';
import { openNavigation } from '../../location/openNavigation';
import type { AppStackParamList } from '../../navigation/types';
import type { RiderOrder } from '../../data/mockOrders';

type Props = NativeStackScreenProps<AppStackParamList, 'OrderDetail'>;

// User-supplied trip-line end markers (Pinterest-hosted, referenced by URL
// like any other remote image — RN's Image fetches at render, no local
// download step).
const TRIP_START_ICON = 'https://i.pinimg.com/736x/d0/21/cc/d021cc669f8688a757199873421035f3.jpg';
const TRIP_END_ICON = 'https://i.pinimg.com/1200x/a6/2a/df/a62adf699b6951ec9d0fa954f1edc5b3.jpg';

const NEXT_ACTION_LABEL: Record<Exclude<RiderOrder['status'], 'delivered' | 'cancelled'>, string> = {
  assigned: 'Slide to start delivery',
  picked_up: "I've arrived at the customer",
  arrived_at_customer: 'Verify OTP',
};

export function OrderDetailScreen({ route, navigation }: Props) {
  const { orderId } = route.params;
  // Select the stable-ref activeOrders array and derive order/siblings from
  // it — a selector that returns a fresh .find()/.filter() result every
  // render makes zustand's useSyncExternalStore loop ("getSnapshot should be
  // cached" → max update depth). Deriving below is plain render-time work.
  const activeOrders = useRiderOrdersStore((s) => s.activeOrders);
  const order = activeOrders.find((o) => o.id === orderId);
  // Every other active leg of the same multi-store trip (backend's own
  // trip_id — RiderOrder.tripId's note) — same customer/drop address,
  // different store each. Empty for the common single-store order.
  const siblingLegs = order?.tripId ? activeOrders.filter((o) => o.tripId === order.tripId && o.id !== order.id) : [];
  const advanceOrderStatus = useRiderOrdersStore((s) => s.advanceOrderStatus);
  const cancelOrder = useRiderOrdersStore((s) => s.cancelOrder);
  const failOrder = useRiderOrdersStore((s) => s.failOrder);
  const [otpVisible, setOtpVisible] = useState(false);
  const [cancelVisible, setCancelVisible] = useState(false);
  const [failureVisible, setFailureVisible] = useState(false);
  // Real Google-Directions driving ETA once the routed line lands; null until
  // then (and when routing is unavailable), where the flat distance/avg-speed
  // estimate below fills in.
  const [routeEtaMin, setRouteEtaMin] = useState<number | null>(null);

  if (!order) {
    // Already delivered/removed from activeOrders elsewhere (e.g. after
    // confirming delivery) — nothing left here to show, back out.
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-center text-base font-semibold text-ink">This order is no longer active.</Text>
        <Pressable onPress={() => navigation.goBack()} className="mt-4">
          <Text className="text-[14px] font-bold text-ink/60">Go back</Text>
        </Pressable>
      </View>
    );
  }

  // Every sibling leg still waiting to be picked up from its own store —
  // the pickup step stays genuinely PER-STORE (the rider physically visits
  // each one in turn), so this screen never groups THAT action across
  // legs. It only groups the drop-off side below, which is real: there's
  // one customer, one address, one arrival, regardless of how many stores
  // fed into this trip.
  const unpickedSiblings = siblingLegs.filter((leg) => leg.status === 'assigned');
  // Once every leg has actually been collected, "arriving at the
  // customer"/"confirm delivery" is one shared event for the whole trip,
  // not N separate ones — advanceOrderStatus is called for this order AND
  // every sibling leg together so they move through arrived_at_customer
  // and delivered in lockstep.
  const tripLegIds = [order.id, ...siblingLegs.map((leg) => leg.id)];

  // advanceOrderStatus/cancelOrder now hit the real backend (assigned ->
  // picked_up and arrived_at_customer -> delivered are real PATCH /orders/
  // :id/status calls) — a network failure or an unexpected 403/409 needs
  // to actually stop the rider from thinking the step went through, not
  // just silently proceed to close the screen either way.
  async function handlePrimaryAction() {
    if (order!.status === 'arrived_at_customer') {
      setOtpVisible(true);
      return;
    }
    try {
      // Reaching this branch (not the pickup slide-button below) only
      // happens once every trip leg is already picked_up or beyond — see
      // this screen's own allLegsPickedUp guard on the map branch — so
      // advancing every leg together here is always the whole trip
      // actually arriving, never a leg that's still mid-pickup elsewhere.
      await Promise.all(tripLegIds.map((id) => advanceOrderStatus(id)));
    } catch (err) {
      Alert.alert('Could not update this order', err instanceof Error ? err.message : 'Please try again.');
    }
  }

  // code is the 4-digit delivery OTP the rider read off the customer's own
  // order — the backend gates every leg's delivered write on it matching
  // orders.delivery_otp (all legs of a trip share one code). Don't close the
  // modal until the awaited PATCH actually succeeds: a wrong code is a real
  // 400 (INVALID_OTP) that must leave the modal open so the rider can retry,
  // not dismiss it and strand them on an undelivered order.
  async function handleConfirmDelivery(code: string) {
    try {
      await advanceOrderStatus(order!.id, code);
      setOtpVisible(false);
      navigation.goBack();
    } catch (err) {
      Alert.alert('Could not confirm delivery', err instanceof Error ? err.message : 'Please try again.');
    }
  }

  async function handleConfirmCancel(reason: string) {
    setCancelVisible(false);
    try {
      await cancelOrder(order!.id, reason);
      navigation.goBack();
    } catch (err) {
      Alert.alert('Could not cancel this delivery', err instanceof Error ? err.message : 'Please try again.');
    }
  }

  // Post-pickup counterpart to cancel: rider couldn't complete the drop
  // (customer unreachable/refused/bad address). Backend moves the order to
  // terminal 'failed' and pays the rider the full fee; refund is a manual
  // admin review, not fired here. failOrder drops it from the active list.
  async function handleConfirmFailure(reason: string) {
    setFailureVisible(false);
    try {
      await failOrder(order!.id, reason);
      navigation.goBack();
    } catch (err) {
      Alert.alert('Could not mark this delivery failed', err instanceof Error ? err.message : 'Please try again.');
    }
  }

  // Delivery-failed only applies post-pickup (there's a parcel in hand) and
  // only to a single-store order — a multi-store trip leg failing isn't
  // supported yet (backend rejects TRIP_FAILURE_UNSUPPORTED), so the action
  // stays hidden for trips rather than offering a tap that always errors.
  const canFail = !order.tripId && (order.status === 'picked_up' || order.status === 'arrived_at_customer');

  const isAtCustomer = order.status === 'arrived_at_customer';
  // The full-screen "heading to customer" map only makes sense once every
  // store in the trip has actually been visited — a rider who's picked up
  // Store 1 but still needs Store 2 isn't heading to the customer yet,
  // regardless of what THIS one leg's own status says.
  const allLegsPickedUp = unpickedSiblings.length === 0;

  // Only the final OTP-verify leg (arrived_at_customer) renders the inline
  // map now — the picked_up "heading to the drop" map moved to its own
  // DeliveryNavigationScreen (the customer twin of PickupNavigation). This
  // screen is still reachable while picked_up (its chevron/back), so the
  // scroll branch below handles that case with a "Continue to customer" bar.
  if (isAtCustomer && allLegsPickedUp) {
    // Full-screen, Uber-style navigating view: the map IS the screen the
    // instant the rider's got the order — no intermediate route-card/fare
    // list screen to tap through first. Shared by picked_up (heading to
    // customer) and arrived_at_customer (final leg) — same file, same map,
    // only the bottom action differs (advance to arrived_at_customer vs.
    // verify OTP).
    // Real routed ETA (routeEtaMin, from DeliveryMapView's onRouteInfo) when
    // Directions answered; otherwise a flat distance/avg-speed estimate.
    // ponytail: 20 km/h avg-speed fallback is a guess, fine while it's only
    // the no-route case — the routed number is the real one.
    const etaMinutes = routeEtaMin ?? Math.max(1, Math.round((order.distanceKm / 20) * 60));

    return (
      <View className="flex-1 bg-white">
        <DeliveryMapView
          destination={order.customerCoords}
          destinationKind="customer"
          fullScreen
          onRouteInfo={(info) => setRouteEtaMin(info.durationMin)}
        />

        <View className="absolute inset-x-4 top-safe-offset-4 flex-row items-center justify-between">
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={10}
            style={shadow.chip}
            className="h-10 w-10 items-center justify-center rounded-full bg-white"
          >
            <AppIcon icon={ArrowLeft01Icon} size={18} color={colors.ink} />
          </Pressable>
          {/* Google Maps-style ETA badge — big number, small unit label
              underneath, on a green surface (brand lime, not white) so it
              reads as the "good news" ETA callout at a glance instead of
              blending into every other white pill on screen. */}
          <View style={shadow.chip} className="items-center rounded-2xl bg-lime px-4 py-2">
            <Text className="text-[24px] font-extrabold leading-none text-ink">{etaMinutes}</Text>
            <Text className="text-[11px] font-bold text-ink/70">min{etaMinutes === 1 ? '' : 's'} away</Text>
          </View>
        </View>

        <View style={shadow.sheet} className="absolute inset-x-4 bottom-safe-offset-4 gap-5 rounded-[28px] bg-white px-5 py-6">
          <View className="flex-row items-center gap-3.5">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-lime-soft">
              <Text className="text-[18px] font-bold text-lime-deep">
                {order.customerName
                  .split(' ')
                  .map((word) => word[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-[12.5px] text-ink/45">Order {order.orderNumber}</Text>
              <Text className="text-[19px] font-bold text-ink">{order.customerName}</Text>
              <Text numberOfLines={1} className="mt-0.5 text-[13px] text-ink/50">
                {order.customerAddress}
              </Text>
            </View>
          </View>

          {/* Multi-stop trip banner — this rider is now carrying items
              picked up from every store in the trip (allLegsPickedUp
              guards this whole branch), so the payout/items row below
              needs to add up ALL of them, not just this one leg's own
              numbers, or it would silently under-report what one drop-off
              actually earns. */}
          {siblingLegs.length > 0 && (
            <View className="flex-row items-center gap-2 rounded-xl bg-lime-soft px-3 py-2">
              <AppIcon icon={PackageIcon} size={14} color={colors.limeDeep} />
              <Text className="text-[12px] font-bold text-lime-deep">
                {siblingLegs.length + 1}-stop trip — picked up from {[order, ...siblingLegs].map((leg) => leg.storeName).join(', ')}
              </Text>
            </View>
          )}

          <CollectCashBanner paymentMethod={order.paymentMethod} cashToCollect={order.cashToCollect} />

          {/* Package/payout row — same data the old scroll-list screen
              showed, surfaced here instead so the card isn't just a name
              and a button: a rider glancing at this wants to know what
              they're carrying and what it pays without leaving the map. */}
          <View className="flex-row items-center justify-between border-t border-mist pt-4">
            <View className="flex-row items-center gap-2">
              <AppIcon icon={PackageIcon} size={16} color={colors.ink} />
              <Text className="text-[13px] font-semibold text-ink/70">
                {order.itemCount + siblingLegs.reduce((sum, leg) => sum + leg.itemCount, 0)} items · {order.distanceKm} km
              </Text>
            </View>
            <Text className="text-[16px] font-bold text-ink">₹{order.payout}</Text>
          </View>

          <View className="flex-row gap-3">
            <Pressable onPress={handlePrimaryAction} className="flex-1 items-center justify-center rounded-2xl bg-ink py-4">
              <Text className="text-[15px] font-bold text-white">
                {isAtCustomer ? NEXT_ACTION_LABEL.arrived_at_customer : NEXT_ACTION_LABEL.picked_up}
              </Text>
            </Pressable>
            {/* Hand off to the rider's real maps app for turn-by-turn to the
                customer — the in-app map above is only "am I close?" context. */}
            <Pressable
              onPress={() => void openNavigation(order.customerCoords, order.customerName)}
              className="h-[56px] w-[56px] items-center justify-center rounded-2xl border border-gray-200"
            >
              <AppIcon icon={Navigation03Icon} size={20} color={colors.ink} />
            </Pressable>
            <Pressable
              onPress={() => void Linking.openURL(`tel:${order.customerPhone}`)}
              className="h-[56px] w-[56px] items-center justify-center rounded-2xl border border-gray-200"
            >
              <AppIcon icon={Call02Icon} size={20} color={colors.ink} />
            </Pressable>
          </View>

          {canFail && (
            <Pressable onPress={() => setFailureVisible(true)} className="items-center py-1">
              <Text className="text-[13px] font-semibold text-danger">Delivery failed</Text>
            </Pressable>
          )}
        </View>

        <DeliveryOtpModal visible={otpVisible} onCancel={() => setOtpVisible(false)} onConfirm={handleConfirmDelivery} />
        <DeliveryFailureModal visible={failureVisible} onCancel={() => setFailureVisible(false)} onConfirm={handleConfirmFailure} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" contentContainerClassName="gap-5 px-5 pb-6 pt-safe-offset-4">
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={10}
            className="h-9 w-9 items-center justify-center rounded-full border border-gray-100"
          >
            <AppIcon icon={ArrowLeft01Icon} size={18} color={colors.ink} />
          </Pressable>
          <Text className="text-xl font-bold text-ink">Order Id: {order.orderNumber}</Text>
        </View>

        {/* Multi-store trip progress — only shown when this order is one
            leg of a trip (siblingLegs.length > 0). Tells the rider what's
            still ahead (other stores not yet picked up) or that this store
            was the last one and the customer drop is next. */}
        {siblingLegs.length > 0 && (
          <View className="gap-1 rounded-2xl bg-lime-soft px-4 py-3">
            <Text className="text-[12px] font-bold uppercase tracking-wide text-lime-deep">
              {siblingLegs.length + 1}-stop trip · one delivery
            </Text>
            <Text className="text-[13px] font-semibold text-ink/70">
              {order.status === 'assigned'
                ? `Pick up here first, then: ${unpickedSiblings.map((leg) => leg.storeName).join(', ') || 'head to the customer'}`
                : unpickedSiblings.length > 0
                  ? `Picked up here — still need: ${unpickedSiblings.map((leg) => leg.storeName).join(', ')}`
                  : 'All stores picked up — heading to the customer next.'}
            </Text>
          </View>
        )}

        {/* Trip line — full-width rule with Start/distance underneath,
            same minimal recipe as the wireframe: no dots, no icons, just
            the line and the two numbers that matter. Light weight, not a
            heavy full-ink bar. */}
        <View className="w-full gap-2">
          <View className="flex-row items-center gap-2">
            <Image source={{ uri: TRIP_START_ICON }} className="h-8 w-8" resizeMode="contain" />
            <View className="h-px flex-1 bg-gray-200" />
            <Image source={{ uri: TRIP_END_ICON }} className="h-8 w-8" resizeMode="contain" />
          </View>
          <View className="flex-row items-center justify-between">
            <Text className="text-[13px] font-semibold text-ink/60">Start</Text>
            <Text className="text-[13px] font-semibold text-ink/60">{order.distanceKm}km</Text>
          </View>
        </View>

        {/* Pickup -> drop route — same dot/dashed-line/dot recipe as
            ActiveDeliveryCard.tsx's own trip summary, for a rider to read
            "where do I go" at a glance instead of parsing two flat rows. */}
        <View className="flex-row gap-3 rounded-2xl bg-white p-4">
          <View className="items-center py-0.5" style={{ width: 14 }}>
            <View className="h-3 w-3 items-center justify-center rounded-full bg-lime-deep">
              <AppIcon icon={Store01Icon} size={8} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1, width: 0, borderLeftWidth: 2, borderStyle: 'dashed', borderColor: '#C7D0CE', marginVertical: 4 }} />
            <View className="h-3 w-3 rounded-full bg-coral" />
          </View>
          <View className="flex-1 justify-between gap-4">
            <View>
              <Text className="text-[14px] font-bold text-ink">{order.storeName}</Text>
              <Text className="mt-0.5 text-[12.5px] text-ink/50">{order.storeAddress}</Text>
            </View>
            <View>
              <Text className="text-[14px] font-bold text-ink">{order.customerName}</Text>
              <Text className="mt-0.5 text-[12.5px] text-ink/50">{order.customerAddress}</Text>
            </View>
          </View>
        </View>

        {/* Navigate to the pickup store — real turn-by-turn in the rider's own
            maps app. Only while still heading to the store (assigned); once
            picked up, the drop-leg map's own Navigate button takes over. */}
        {order.status === 'assigned' && (
          <Pressable
            onPress={() => void openNavigation(order.storeCoords, order.storeName)}
            className="flex-row items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white py-3.5"
          >
            <AppIcon icon={Navigation03Icon} size={18} color={colors.ink} />
            <Text className="text-[14px] font-bold text-ink">Navigate to store</Text>
          </Pressable>
        )}

        <CollectCashBanner paymentMethod={order.paymentMethod} cashToCollect={order.cashToCollect} />

        <View className="gap-2.5 rounded-2xl bg-white px-4 py-3.5">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <AppIcon icon={PackageIcon} size={16} color={colors.ink} />
              <Text className="text-[13px] font-semibold text-ink/70">
                {order.itemCount} items · {order.distanceKm} km
              </Text>
            </View>
            <Text className="text-[15px] font-semibold text-ink">₹{order.payout}</Text>
          </View>

          {/* What's actually in the bag — a rider picking up from the
              store benefits from knowing this before they're standing at
              the counter, not just a bare count. Always shown, no
              expand/collapse — this is the same kind of thing the fare
              breakup below already is, plainly on screen, not tucked
              behind a tap. */}
          <View className="gap-1.5 border-t border-mist pt-2.5">
            <Text className="text-[13px] font-semibold text-ink/70">Items</Text>
            {order.items.map((item) => (
              <View key={item.name} className="flex-row items-center justify-between">
                <Text className="text-[13px] text-ink/60">{[item.name, item.unit].filter(Boolean).join(' · ')}</Text>
                <Text className="text-[13px] font-semibold text-ink/60">×{item.quantity}</Text>
              </View>
            ))}
          </View>

          {/* Itemized payout breakup — an unexplained total is the #1
              driver of payout-dispute reviews in every gig app. Surge
              always shown now (₹0 when there isn't one), same as Base
              fare/Distance — a rider should see it's a real tracked
              component of every payout, not something that only exists
              on screen the days it's non-zero. */}
          <View className="gap-1 border-t border-mist pt-2.5">
            <View className="flex-row justify-between">
              <Text className="text-[13px] text-ink/60 font-medium">Base fare</Text>
              <Text className="text-[13px] text-ink/70 font-medium">₹{order.baseFare}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-[13px] text-ink/60 font-medium">Extra stores</Text>
              <Text className="text-[13px] text-ink/70 font-medium">₹{order.extraStopFare}</Text>
            </View>
            <View
              className={`flex-row items-center justify-between rounded-lg px-2 py-1 ${order.surge > 0 ? 'bg-surge-soft' : 'bg-mist'}`}
            >
              <Text className={`text-[12.5px] font-semibold ${order.surge > 0 ? 'text-surge' : 'text-ink/60'}`}>Surge</Text>
              <Text className={`text-[12.5px] font-bold ${order.surge > 0 ? 'text-surge' : 'text-ink/70'}`}>
                {order.surge > 0 ? `+₹${order.surge}` : '₹0'}
              </Text>
            </View>
          </View>
        </View>

        {/* Cancelling only makes sense before this specific leg's own
            pickup — once picked up (even if still waiting on sibling
            stores), there's real inventory in hand, same rule this screen
            already applied for the single-store case. */}
        {order.status === 'assigned' && (
          <Pressable onPress={() => setCancelVisible(true)} className="items-center py-2">
            <Text className="text-[13px] font-semibold text-danger">Cancel this delivery</Text>
          </Pressable>
        )}

        {/* Post-pickup: can no longer cancel, but a drop that can't be
            completed (customer unreachable/refused/wrong address) needs an
            exit — this is that exit. Single-store orders only (canFail). */}
        {canFail && (
          <Pressable onPress={() => setFailureVisible(true)} className="items-center py-2">
            <Text className="text-[13px] font-semibold text-danger">Delivery failed</Text>
          </Pressable>
        )}
      </ScrollView>

      <View className="border-t border-mist bg-white px-5 pb-safe-offset-4 pt-4">
        {order.status === 'assigned' ? (
          // Still 'assigned' only now — picked_up-and-done legs fall
          // through to the "Continue to customer" bar below (every leg
          // collected → drop nav) or the "waiting" state (siblings still
          // pending), never back to this slide button a second time.
          <SlideToConfirmButton label={NEXT_ACTION_LABEL.assigned} successLabel="Heading to customer" onConfirm={handlePrimaryAction} />
        ) : allLegsPickedUp ? (
          // Whole trip picked up — the real next step is the drop-leg map
          // (DeliveryNavigation). Primary (blue) CTA.
          <Pressable
            onPress={() => navigation.navigate('DeliveryNavigation', { orderId })}
            className="h-14 items-center justify-center rounded-2xl"
            style={({ pressed }) => ({ backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 })}
          >
            <Text className="text-[15px] font-bold text-white">Continue to customer</Text>
          </Pressable>
        ) : (
          // Picked up here, but a sibling store isn't ready yet — nothing
          // to confirm at THIS screen right now; the rider's real next
          // action is opening the next store's own OrderDetail from the
          // trip's job card on OrdersScreen.
          <View className="items-center rounded-2xl bg-gray-100 py-4">
            <Text className="text-[13px] font-bold text-ink/50">Waiting on other pickups in this trip</Text>
          </View>
        )}
      </View>

      <DeliveryOtpModal visible={otpVisible} onCancel={() => setOtpVisible(false)} onConfirm={handleConfirmDelivery} />
      <CancelOrderModal visible={cancelVisible} onCancel={() => setCancelVisible(false)} onConfirm={handleConfirmCancel} />
      <DeliveryFailureModal visible={failureVisible} onCancel={() => setFailureVisible(false)} onConfirm={handleConfirmFailure} />
    </View>
  );
}

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
// No customer-facing "out for delivery" push/rating-popup here — that's
// the customer app's own screen and would need a real backend endpoint
// this rider app has no route to yet (backend/src/routes/rider.ts doesn't
// exist). Flagged, not faked.

import { useState } from 'react';
import { ArrowLeft01Icon, Call02Icon, PackageIcon, Store01Icon } from '@hugeicons/core-free-icons';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/AppIcon';
import { SlideToConfirmButton } from '../../components/SlideToConfirmButton';
import { colors } from '../../theme/tokens';
import { STATUS_STEPS, useRiderOrdersStore } from '../../store/useRiderOrdersStore';
import { DeliveryOtpModal } from './components/DeliveryOtpModal';
import { CancelOrderModal } from './components/CancelOrderModal';
import { DeliveryMapView } from './components/DeliveryMapView';
import type { AppStackParamList } from '../../navigation/types';
import type { RiderOrder } from '../../data/mockOrders';

type Props = NativeStackScreenProps<AppStackParamList, 'OrderDetail'>;

const STEP_LABEL: Record<RiderOrder['status'], string> = {
  assigned: 'Assigned',
  picked_up: 'Picked up',
  arrived_at_customer: 'At customer',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const NEXT_ACTION_LABEL: Record<Exclude<RiderOrder['status'], 'delivered' | 'cancelled'>, string> = {
  assigned: 'Slide to start delivery',
  picked_up: "I've arrived at the customer",
  arrived_at_customer: 'Verify OTP',
};

export function OrderDetailScreen({ route, navigation }: Props) {
  const { orderId } = route.params;
  const order = useRiderOrdersStore((s) => s.activeOrders.find((o) => o.id === orderId));
  const advanceOrderStatus = useRiderOrdersStore((s) => s.advanceOrderStatus);
  const cancelOrder = useRiderOrdersStore((s) => s.cancelOrder);
  const [otpVisible, setOtpVisible] = useState(false);
  const [cancelVisible, setCancelVisible] = useState(false);

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

  const stepIndex = STATUS_STEPS.indexOf(order.status);

  function handlePrimaryAction() {
    if (order!.status === 'arrived_at_customer') {
      setOtpVisible(true);
      return;
    }
    advanceOrderStatus(order!.id);
  }

  function handleConfirmDelivery() {
    setOtpVisible(false);
    advanceOrderStatus(order!.id);
    navigation.goBack();
  }

  function handleConfirmCancel(reason: string) {
    setCancelVisible(false);
    cancelOrder(order!.id, reason);
    navigation.goBack();
  }

  const isAtCustomer = order.status === 'arrived_at_customer';

  if (order.status === 'picked_up' || isAtCustomer) {
    // Full-screen, Uber-style navigating view: the map IS the screen the
    // instant the rider's got the order — no intermediate route-card/fare
    // list screen to tap through first. Shared by picked_up (heading to
    // customer) and arrived_at_customer (final leg) — same file, same map,
    // only the bottom action differs (advance to arrived_at_customer vs.
    // verify OTP).
    // ponytail: ETA is a flat distance/avg-speed estimate (no routing API
    // call yet), upgrade to a real Directions-API duration when that
    // integration lands alongside the routed polyline (see
    // DeliveryMapView.tsx's own note on the straight-line connector).
    const etaMinutes = Math.max(1, Math.round((order.distanceKm / 20) * 60));

    return (
      <View className="flex-1 bg-white">
        <DeliveryMapView customerCoords={order.customerCoords} fullScreen />

        <View className="absolute inset-x-4 top-safe-offset-4 flex-row items-center justify-between">
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={10}
            className="h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm shadow-black/20"
          >
            <AppIcon icon={ArrowLeft01Icon} size={18} color={colors.ink} />
          </Pressable>
          {/* Google Maps-style ETA badge — big number, small unit label
              underneath, on a green surface (brand lime, not white) so it
              reads as the "good news" ETA callout at a glance instead of
              blending into every other white pill on screen. */}
          <View className="items-center rounded-2xl bg-lime px-4 py-2 shadow-sm shadow-black/20">
            <Text className="text-[24px] font-extrabold leading-none text-ink">{etaMinutes}</Text>
            <Text className="text-[11px] font-bold text-ink/70">min{etaMinutes === 1 ? '' : 's'} away</Text>
          </View>
        </View>

        <View className="absolute inset-x-4 bottom-safe-offset-4 gap-5 rounded-[28px] bg-white px-5 py-6 shadow-xl shadow-black/25">
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

          {/* Package/payout row — same data the old scroll-list screen
              showed, surfaced here instead so the card isn't just a name
              and a button: a rider glancing at this wants to know what
              they're carrying and what it pays without leaving the map. */}
          <View className="flex-row items-center justify-between border-t border-mist pt-4">
            <View className="flex-row items-center gap-2">
              <AppIcon icon={PackageIcon} size={16} color={colors.ink} />
              <Text className="text-[13px] font-semibold text-ink/70">
                {order.itemCount} items · {order.distanceKm} km
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
            <Pressable
              onPress={() => void Linking.openURL(`tel:${order.customerPhone}`)}
              className="h-[56px] w-[56px] items-center justify-center rounded-2xl border border-gray-200"
            >
              <AppIcon icon={Call02Icon} size={20} color={colors.ink} />
            </Pressable>
          </View>
        </View>

        <DeliveryOtpModal visible={otpVisible} onCancel={() => setOtpVisible(false)} onConfirm={handleConfirmDelivery} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1" contentContainerClassName="gap-5 px-5 pb-6 pt-safe-offset-4">
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={10}
            className="h-9 w-9 items-center justify-center rounded-full border border-gray-100"
          >
            <AppIcon icon={ArrowLeft01Icon} size={18} color={colors.ink} />
          </Pressable>
          <View>
            <Text className="text-[13px] text-ink/45">Order</Text>
            <Text className="text-2xl font-bold text-ink">{order.orderNumber}</Text>
          </View>
        </View>

        {/* Step progress */}
        <View className="flex-row items-center">
          {STATUS_STEPS.map((step, index) => {
            const isDone = index <= stepIndex;
            const isLast = index === STATUS_STEPS.length - 1;
            return (
              <View key={step} className="flex-1 flex-row items-center">
                <View className={`h-2.5 w-2.5 rounded-full ${isDone ? 'bg-lime-deep' : 'bg-gray-200'}`} />
                {!isLast ? <View className={`h-[2px] flex-1 ${index < stepIndex ? 'bg-lime-deep' : 'bg-gray-200'}`} /> : null}
              </View>
            );
          })}
        </View>
        <Text className="-mt-3 text-[12.5px] font-semibold text-ink/50">{STEP_LABEL[order.status]}</Text>

        {/* Pickup -> drop route — same dot/dashed-line/dot recipe as
            ActiveDeliveryCard.tsx's own trip summary, for a rider to read
            "where do I go" at a glance instead of parsing two flat rows. */}
        <View className="flex-row gap-3 rounded-2xl bg-mist p-4">
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

        <View className="gap-2.5 rounded-2xl border border-gray-100 px-4 py-3.5">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <AppIcon icon={PackageIcon} size={16} color={colors.ink} />
              <Text className="text-[13px] font-semibold text-ink/70">
                {order.itemCount} items · {order.distanceKm} km
              </Text>
            </View>
            <Text className="text-[15px] font-bold text-ink">₹{order.payout}</Text>
          </View>
          {/* Itemized payout breakup — an unexplained total is the #1
              driver of payout-dispute reviews in every gig app. */}
          <View className="gap-1 border-t border-mist pt-2.5">
            <View className="flex-row justify-between">
              <Text className="text-[12.5px] text-ink/50">Base fare</Text>
              <Text className="text-[12.5px] text-ink/70">₹{order.baseFare}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-[12.5px] text-ink/50">Distance</Text>
              <Text className="text-[12.5px] text-ink/70">₹{order.distanceFare}</Text>
            </View>
            {order.surge > 0 ? (
              <View className="flex-row items-center justify-between rounded-lg bg-surge-soft px-2 py-1">
                <Text className="text-[12.5px] font-semibold text-surge">Surge</Text>
                <Text className="text-[12.5px] font-bold text-surge">+₹{order.surge}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* This scroll screen is 'assigned' only now — picked_up and
            arrived_at_customer both go straight to the full-screen map
            branch above. Only real action left here is cancelling before
            the order's even picked up; Call/Navigate to the store were
            already dropped (CLAUDE.md: rider's already at the store by
            the time this screen matters). */}
        <Pressable onPress={() => setCancelVisible(true)} className="items-center py-2">
          <Text className="text-[13px] font-semibold text-danger">Cancel this delivery</Text>
        </Pressable>
      </ScrollView>

      <View className="border-t border-mist px-5 pb-safe-offset-4 pt-4">
        <SlideToConfirmButton
          label={NEXT_ACTION_LABEL.assigned}
          successLabel="Heading to customer"
          onConfirm={() => advanceOrderStatus(order!.id)}
        />
      </View>

      <DeliveryOtpModal visible={otpVisible} onCancel={() => setOtpVisible(false)} onConfirm={handleConfirmDelivery} />
      <CancelOrderModal visible={cancelVisible} onCancel={() => setCancelVisible(false)} onConfirm={handleConfirmCancel} />
    </View>
  );
}

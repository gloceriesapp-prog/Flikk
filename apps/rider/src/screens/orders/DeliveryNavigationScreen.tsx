// Full-screen drop-leg navigation — the customer-side twin of
// PickupNavigationScreen. Reached after "Verify & pick up" (order is now
// picked_up / out_for_delivery). Same strategy as the pickup screen: the
// in-app map is CONTEXT ONLY ("am I close to the customer?") — rider's live
// GPS dot + a fixed customer pin + a straight connector (DeliveryMapView, no
// Directions API). Real turn-by-turn hands OFF to the rider's own maps app
// via openNavigation (the "Go to drop" row + the Navigate deep-link).
//
// "I've arrived" is a slide-to-confirm (not a tap) — same gesture language as
// the pickup screens' arrival slide. Sliding advances picked_up→
// arrived_at_customer (local milestone, no backend column between
// out_for_delivery and delivered) and pushes DeliveryProof, which owns the
// final OTP-verified delivery write + the no-handover fallbacks.
//
// Needs a native dev build to render the map (react-native-maps isn't in
// Expo Go SDK 52+, DeliveryMapView's own note).

import { useState } from 'react';
import { Alert, Linking, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Call02Icon,
  InformationCircleIcon,
  Location01Icon,
  MapPinIcon,
  Navigation03Icon,
} from '@hugeicons/core-free-icons';
import { AppIcon } from '../../components/AppIcon';
import { SlideToConfirmButton } from '../../components/SlideToConfirmButton';
import { colors } from '../../theme/tokens';
import { DeliveryMapView } from './components/DeliveryMapView';
import { openNavigation } from '../../location/openNavigation';
import { distanceKm, etaMinutes } from '../../utils/geo';
import { useRiderOrdersStore } from '../../store/useRiderOrdersStore';
import type { Coordinates } from '../../location/riderLocation';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'DeliveryNavigation'>;

function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function DeliveryNavigationScreen({ route, navigation }: Props) {
  const { orderId } = route.params;
  // Select the stable-ref activeOrders array and derive from it — a selector
  // returning a fresh .filter() every render makes zustand loop ("getSnapshot
  // should be cached" → max update depth). Derive below at render time.
  const activeOrders = useRiderOrdersStore((s) => s.activeOrders);
  const advanceOrderStatus = useRiderOrdersStore((s) => s.advanceOrderStatus);
  const order = activeOrders.find((o) => o.id === orderId);
  // Every leg of the same trip (one customer, one arrival) — all advance to
  // arrived_at_customer together on "I've arrived", same rule OrderDetail
  // uses. Just [order] for the common single-store drop.
  const tripLegs = order?.tripId
    ? activeOrders.filter((o) => o.tripId === order.tripId)
    : order
      ? [order]
      : [];
  const insets = useSafeAreaInsets();
  // Live rider position, fed by DeliveryMapView's own GPS watch via
  // onRiderMove — no second location watcher opened here.
  const [riderCoords, setRiderCoords] = useState<Coordinates | null>(null);
  const [arriving, setArriving] = useState(false);

  if (!order) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-center text-base font-semibold text-ink">This order is no longer active.</Text>
        <Pressable onPress={() => navigation.goBack()} className="mt-4">
          <Text className="text-[14px] font-bold text-ink/60">Go back</Text>
        </Pressable>
      </View>
    );
  }

  // rider→customer straight-line distance/ETA — null until the first GPS fix
  // lands (shows "Locating…" until then rather than a bogus 0.0 km).
  const km = riderCoords ? distanceKm(riderCoords, order.customerCoords) : null;
  const eta = km != null ? etaMinutes(km) : null;
  const legText = km != null ? `${km} km · ${eta} min` : 'Locating…';

  const callCustomer = () => Linking.openURL(`tel:${order.customerPhone}`);

  // picked_up → arrived_at_customer for every trip leg together (local
  // milestone, no PATCH). Throws surface as an Alert. On success push
  // DeliveryProof (the OTP + outcome step) — replace so back doesn't dump the
  // rider back on this nav screen mid-verify.
  const arrived = async () => {
    if (arriving) return;
    setArriving(true);
    try {
      await Promise.all(tripLegs.map((leg) => advanceOrderStatus(leg.id)));
      navigation.replace('DeliveryProof', { orderId });
    } catch (e) {
      setArriving(false);
      Alert.alert('Could not update this order', e instanceof Error ? e.message : 'Please try again.');
    }
  };

  return (
    <View className="flex-1 bg-ink">
      <DeliveryMapView
        destination={order.customerCoords}
        destinationKind="customer"
        fullScreen
        onRiderMove={setRiderCoords}
      />

      {/* Back arrow — floats over the map, safe-area aware. */}
      <Pressable
        onPress={() => navigation.goBack()}
        style={{ top: insets.top + 12 }}
        className="absolute left-4 h-11 w-11 items-center justify-center rounded-full bg-white shadow-md shadow-black/20"
      >
        <AppIcon icon={ArrowLeft01Icon} size={22} color={colors.ink} />
      </Pressable>

      {/* Distance/ETA pill — white, top-left next to back, with a nav arrow.
          Same at-a-glance "am I close?" pill the pickup screen uses. */}
      <View
        style={{ top: insets.top + 12 }}
        className="absolute left-[68px] h-11 flex-row items-center gap-2 rounded-full bg-white px-4 shadow-md shadow-black/20"
      >
        <AppIcon icon={Navigation03Icon} size={18} color={colors.ink} />
        <Text className="text-[15px] font-semibold text-ink tabular-nums">{legText}</Text>
      </View>

      {/* Bottom sheet — white, same language as the pickup screen. Drop
          hand-off + customer card + Call + address/landmark/instruction
          + slide "I've arrived" → DeliveryProof (OTP + outcome). */}
      <View
        style={{ paddingBottom: insets.bottom + 20 }}
        className="absolute inset-x-0 bottom-0 gap-4 rounded-t-3xl bg-white px-5 pt-9 shadow-2xl shadow-black/25"
      >
        {/* "Go to drop" → the Swiggy-style hand-off: taps out to the rider's
            real maps app for turn-by-turn. The in-app map above is context;
            THIS is the actual navigation. */}
        <Pressable
          onPress={() => openNavigation(order.customerCoords, order.customerName)}
          className="flex-row items-center justify-between"
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <View>
            <Text className="text-[11px] font-bold uppercase tracking-wide text-ink/40">Drop</Text>
            <Text className="text-[22px] font-semibold text-ink">Go to drop</Text>
          </View>
          <View className="h-11 w-11 items-center justify-center rounded-full bg-[#F1F2F4]">
            <AppIcon icon={Navigation03Icon} size={22} color={colors.ink} />
          </View>
        </Pressable>

        {/* Customer card — tinted surface, avatar initials + name + masked
            tag; tap opens the full order detail (route, items, payout). */}
        <Pressable
          onPress={() => navigation.navigate('OrderDetail', { orderId })}
          className="flex-row items-center gap-3 rounded-2xl bg-[#F1F2F4] px-4 py-3.5"
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <View className="h-11 w-11 items-center justify-center rounded-full bg-[#F7F7FA]">
            <Text className="text-[15px] font-bold text-ink">{initials(order.customerName)}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-[15px] font-bold text-ink" numberOfLines={1}>{order.customerName}</Text>
            <Text className="text-[12.5px] text-ink/50">Customer · Masked</Text>
          </View>
          <AppIcon icon={ArrowRight01Icon} size={20} color={colors.ink} />
        </Pressable>

        {/* Call — masked calling is the real customer channel. */}
        <Pressable
          onPress={callCustomer}
          className="h-12 flex-row items-center justify-center gap-2 rounded-2xl bg-[#F1F2F4]"
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <AppIcon icon={Call02Icon} size={17} color={colors.ink} />
          <Text className="text-[14px] font-semibold text-ink">Call</Text>
        </Pressable>

        {/* Drop address + optional landmark + delivery instruction — stacked
            in one tinted card. Address is always real (customerAddress);
            landmark and note render only when the backend actually carries
            them (no dummy placeholder copy). */}
        <View className="gap-3 rounded-2xl bg-[#F1F2F4] px-4 py-3.5">
          <View className="flex-row items-start gap-3">
            <AppIcon icon={Location01Icon} size={19} color={colors.ink} />
            <Text className="flex-1 text-[14px] font-semibold text-ink">{order.customerAddress}</Text>
          </View>
          {order.landmark ? (
            <View className="flex-row items-start gap-3">
              <AppIcon icon={MapPinIcon} size={19} color={colors.ink} />
              <Text className="flex-1 text-[13.5px] text-ink/60">{order.landmark}</Text>
            </View>
          ) : null}
          {order.deliveryNote ? (
            <View className="flex-row items-start gap-3">
              <AppIcon icon={InformationCircleIcon} size={19} color={colors.ink} />
              <Text className="flex-1 text-[13.5px] text-ink/60">{order.deliveryNote}</Text>
            </View>
          ) : null}
        </View>

        {/* Slide "I've arrived" → advance every leg to arrived_at_customer,
            then DeliveryProof (OTP + outcome). Slide, not tap, matches the
            pickup screens' arrival gesture. */}
        <SlideToConfirmButton
          label={arriving ? 'Confirming…' : "Slide — I've arrived"}
          successLabel="Arrived at drop"
          onConfirm={arrived}
          disabled={arriving}
        />
      </View>
    </View>
  );
}

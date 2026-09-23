// Full-screen drop-leg navigation — the customer-side twin of
// PickupNavigationScreen. Reached after "Verify & pick up" (order is now
// picked_up / out_for_delivery). Same strategy as the pickup screen: the
// in-app map is CONTEXT ONLY ("am I close to the customer?") — rider's live
// GPS dot + a fixed customer pin + a straight connector (DeliveryMapView, no
// Directions API). Real turn-by-turn hands OFF to the rider's own maps app
// via openNavigation (the "Go to drop" row + the Navigate deep-link).
//
// "I've arrived" is CORAL, not the lime the mockup showed — CLAUDE.md makes
// coral the one and only CTA color (lime is reserved for online/active
// state), same deviation the pickup screen's "I've arrived" already carries.
// Tapping it advances picked_up→arrived_at_customer (local milestone, no
// backend column between out_for_delivery and delivered) and hands off to
// OrderDetail, which owns the final OTP-verified delivery write.
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
  Location01Icon,
  Message01Icon,
  Navigation03Icon,
} from '@hugeicons/core-free-icons';
import { AppIcon } from '../../components/AppIcon';
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

  const callCustomer = () => Linking.openURL(`tel:${order.customerPhone}`);

  // No in-app chat backend yet — masked calling is the real channel.
  // ponytail: wire a real chat thread when support/messaging exists.
  const chatCustomer = () =>
    Alert.alert('Chat', 'In-app chat is coming soon. Call the customer for now.', [
      { text: 'Close', style: 'cancel' },
      { text: 'Call', onPress: callCustomer },
    ]);

  // picked_up → arrived_at_customer for every trip leg together (local
  // milestone, no PATCH). Throws surface as an Alert. On success hand off to
  // OrderDetail for the OTP-verified delivery; replace so back doesn't dump
  // the rider back on this nav screen mid-verify.
  const arrived = async () => {
    if (arriving) return;
    setArriving(true);
    try {
      await Promise.all(tripLegs.map((leg) => advanceOrderStatus(leg.id)));
      navigation.replace('OrderDetail', { orderId });
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

      {/* ETA card — dark, two-line (mockup): big "ETA N min" over the km.
          The at-a-glance "am I close?" the in-app map is here for. */}
      <View
        style={{ top: insets.top + 12 }}
        className="absolute left-20 rounded-2xl bg-ink px-4 py-2.5 shadow-md shadow-black/20"
      >
        <View className="flex-row items-center gap-2">
          <AppIcon icon={Navigation03Icon} size={15} color={colors.lime} />
          <Text className="text-[15px] font-bold text-white">{eta != null ? `ETA ${eta} min` : 'Locating…'}</Text>
        </View>
        {km != null ? <Text className="mt-0.5 text-[13px] font-semibold text-white/60 tabular-nums">{km} km</Text> : null}
      </View>

      {/* Bottom sheet — dark. Customer identity + Call/Chat + drop address +
          "Go to drop" hand-off + coral "I've arrived". */}
      <View
        style={{ paddingBottom: insets.bottom + 16 }}
        className="absolute inset-x-0 bottom-0 gap-3.5 rounded-t-3xl bg-ink px-5 pt-5"
      >
        {/* Customer row — avatar initials, name, masked tag; chevron opens
            the full order detail (route, items, payout breakup). */}
        <Pressable
          onPress={() => navigation.navigate('OrderDetail', { orderId })}
          className="flex-row items-center gap-3.5"
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <View className="h-12 w-12 items-center justify-center rounded-full bg-lime-soft">
            <Text className="text-[16px] font-bold text-lime-deep">{initials(order.customerName)}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-[17px] font-bold text-white">{order.customerName}</Text>
            <Text className="text-[12.5px] text-white/45">Customer · Masked</Text>
          </View>
          <AppIcon icon={ArrowRight01Icon} size={22} color="#FFFFFF" />
        </Pressable>

        {/* Call + Chat — outline pills, side by side (mockup). */}
        <View className="flex-row gap-3">
          <Pressable
            onPress={callCustomer}
            className="h-12 flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-white/25"
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <AppIcon icon={Call02Icon} size={17} color="#FFFFFF" />
            <Text className="text-[14px] font-bold text-white">Call</Text>
          </Pressable>
          <Pressable
            onPress={chatCustomer}
            className="h-12 flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-white/25"
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <AppIcon icon={Message01Icon} size={17} color="#FFFFFF" />
            <Text className="text-[14px] font-bold text-white">Chat</Text>
          </Pressable>
        </View>

        {/* Drop address — real customerAddress (no fabricated landmark note;
            RiderOrder has no delivery-note field). */}
        <View className="flex-row items-start gap-3 rounded-2xl bg-white/5 px-4 py-3">
          <AppIcon icon={Location01Icon} size={20} color={colors.lime} />
          <Text className="flex-1 text-[14px] font-semibold text-white/90">{order.customerAddress}</Text>
        </View>

        {/* "Go to drop" → the Swiggy-style hand-off: taps out to the rider's
            real maps app for turn-by-turn to the customer. The in-app map
            above is context; THIS is the actual navigation. */}
        <Pressable
          onPress={() => openNavigation(order.customerCoords, order.customerName)}
          className="flex-row items-center justify-between rounded-2xl border border-white/15 px-4 py-3"
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <View className="flex-row items-center gap-2.5">
            <AppIcon icon={Navigation03Icon} size={18} color={colors.lime} />
            <Text className="text-[15px] font-bold text-white">Open in Google Maps</Text>
          </View>
          <AppIcon icon={ArrowRight01Icon} size={20} color="#FFFFFF" />
        </Pressable>

        {/* Coral "I've arrived" (coral per CLAUDE.md, not the mockup's lime)
            → advance to arrived_at_customer, then OrderDetail for OTP. */}
        <Pressable
          onPress={arrived}
          disabled={arriving}
          className="h-14 items-center justify-center rounded-2xl"
          style={({ pressed }) => ({ backgroundColor: colors.coral, opacity: arriving ? 0.6 : pressed ? 0.85 : 1 })}
        >
          <Text className="text-[16px] font-bold text-white">{arriving ? 'Confirming…' : "I've arrived"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

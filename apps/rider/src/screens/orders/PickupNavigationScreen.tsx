// Full-screen store-pickup navigation — shown when a rider taps an
// 'assigned' active card. Same strategy as Swiggy/Blinkit/Uber: the in-app
// map is CONTEXT ONLY ("am I close to the store?") — rider's real live GPS
// dot + a fixed store pin + a straight connector line (DeliveryMapView, no
// Directions API). Actual turn-by-turn hands OFF to the rider's own maps
// app via openNavigation (the "Go to pickup" banner + arrow). This is a
// deliberate scope extension past CLAUDE.md's "rider map = final leg only"
// line — a pickup-leg map, requested explicitly.
//
// "I've arrived" is CORAL, not the lime the mockup showed: CLAUDE.md makes
// coral the one and only CTA color (lime is reserved for online/active
// state), so the primary action here follows that rule over the mockup.
// Tapping it pushes PickupVerification (QR + check-items gate) — that
// screen owns the real assigned→picked_up write, not this one.
//
// Needs a native dev build to render the map (react-native-maps isn't in
// Expo Go SDK 52+, DeliveryMapView's own note).

import { useState } from 'react';
import { Alert, Linking, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useIsFocused } from '@react-navigation/native';
import { ArrowLeft01Icon, ArrowRight01Icon, Call02Icon, Navigation03Icon, Store01Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../components/AppIcon';
import { SlideToConfirmButton } from '../../components/SlideToConfirmButton';
import { colors, shadow } from '../../theme/tokens';
import { DeliveryMapView } from './components/DeliveryMapView';
import { openNavigation } from '../../location/openNavigation';
import { distanceKm, etaMinutes } from '../../utils/geo';
import { useRiderOrdersStore } from '../../store/useRiderOrdersStore';
import type { Coordinates } from '../../location/riderLocation';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'PickupNavigation'>;

export function PickupNavigationScreen({ route, navigation }: Props) {
  const { orderId } = route.params;
  const order = useRiderOrdersStore((s) => s.activeOrders.find((o) => o.id === orderId));
  const insets = useSafeAreaInsets();
  // The slide button locks green ("Arrived at store") once slid and stays
  // locked as long as it's mounted. We reach PickupVerification with
  // navigation.navigate (not replace), so THIS screen stays mounted
  // underneath — hitting back would show that stale locked slide with no way
  // to re-slide. Re-arm it by remounting on every refocus: isFocused flips
  // false when Verification covers us and true again on back, and the changed
  // key gives a fresh, un-slid button. (Kept in the screen, not the button —
  // the generic slider knows nothing about navigation focus.)
  const isFocused = useIsFocused();
  // Live rider position, fed by DeliveryMapView's own GPS watch via
  // onRiderMove — no second location watcher opened here.
  const [riderCoords, setRiderCoords] = useState<Coordinates | null>(null);

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

  // rider→store straight-line distance/ETA — null until the first GPS fix
  // lands (shows "Locating…" until then rather than a bogus 0.0 km).
  const km = riderCoords ? distanceKm(riderCoords, order.storeCoords) : null;
  const eta = km != null ? etaMinutes(km) : null;
  const legText = km != null ? `${km} km · ${eta} min` : 'Locating…';

  const callStore = () => {
    if (order.storePhone) {
      Linking.openURL(`tel:${order.storePhone}`);
    } else {
      Alert.alert('No store number', `We don't have a phone number for ${order.storeName} on file.`);
    }
  };

  return (
    <View className="flex-1 bg-ink">
      <DeliveryMapView
        destination={order.storeCoords}
        destinationKind="store"
        fullScreen
        onRiderMove={setRiderCoords}
      />

      {/* Back arrow — floats over the map, safe-area aware. */}
      <Pressable
        onPress={() => navigation.goBack()}
        style={[{ top: insets.top + 12 }, shadow.chip]}
        className="absolute left-4 h-11 w-11 items-center justify-center rounded-full bg-white"
      >
        <AppIcon icon={ArrowLeft01Icon} size={22} color={colors.ink} />
      </Pressable>

      {/* Distance/ETA pill — dark, top-left next to back, with a nav arrow.
          The at-a-glance "am I close?" the in-app map is here for. */}
      <View
        style={[{ top: insets.top + 12 }, shadow.chip]}
        className="absolute left-[68px] h-11 flex-row items-center gap-2 rounded-full bg-white px-4"
      >
        <AppIcon icon={Navigation03Icon} size={18} color={colors.ink} />
        <Text className="text-[15px] font-semibold text-ink tabular-nums">{legText}</Text>
      </View>

      {/* Bottom sheet — dark green. Heading-to-store: nav hand-off + store
          card + "I've arrived" → the PickupVerification screen (QR + item
          checklist), which owns the real assigned→picked_up write. */}
      <View
        style={[{ paddingBottom: insets.bottom + 28 }, shadow.sheet]}
        className="absolute inset-x-0 bottom-0 gap-5 rounded-t-3xl bg-white px-5 pt-9"
      >
        {/* "Go to pickup" → the Swiggy-style hand-off: taps out to the
            rider's real maps app for turn-by-turn. The in-app map above is
            context; THIS is the actual navigation. */}
        <Pressable
          onPress={() => openNavigation(order.storeCoords, order.storeName)}
          className="flex-row items-center justify-between"
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <View>
            <Text className="text-[11px] font-bold uppercase tracking-wide text-ink/40">Pickup</Text>
            <Text className="text-[22px] font-semibold text-ink">Go to pickup</Text>
          </View>
          <View className="h-11 w-11 items-center justify-center rounded-full bg-[#F1F2F4]">
            <AppIcon icon={ArrowRight01Icon} size={22} color={colors.ink} />
          </View>
        </Pressable>

        {/* Store info card — tinted surface, lifts off the white sheet. */}
        <View className="flex-row items-center gap-3 rounded-2xl bg-[#F1F2F4] px-4 py-4">
          <View className="h-11 w-11 items-center justify-center rounded-full bg-[#F7F7FA]">
            <AppIcon icon={Store01Icon} size={22} color={colors.ink} />
          </View>
          <View className="flex-1">
            <Text className="text-[15px] font-bold text-ink" numberOfLines={1}>{order.storeName}</Text>
            <Text className="text-[12.5px] text-ink/50" numberOfLines={1}>{order.storeAddress || 'Grocery Store'}</Text>
          </View>
          <Text className="text-[12.5px] font-semibold text-ink/60 tabular-nums">{legText}</Text>
        </View>

        {/* Actions — "Call store" (secondary) then slide-to-confirm arrival.
            Arriving is now a deliberate swipe, not a tap: it opens the
            PickupVerification gate (QR + check-items) that owns the real
            assigned→picked_up write. Slide instead of the mockup's tap
            button matches the drop-leg's own gesture language. */}
        <View className="gap-3">
          <Pressable
            onPress={callStore}
            className="h-14 flex-row items-center justify-center gap-2 rounded-2xl bg-[#F1F2F4]"
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <AppIcon icon={Call02Icon} size={18} color={colors.ink} />
            <Text className="text-[15px] font-semibold text-ink">Call store</Text>
          </Pressable>
          <SlideToConfirmButton
            key={isFocused ? 'focused' : 'blurred'}
            label="Slide when you arrive"
            successLabel="Arrived at store"
            onConfirm={() => navigation.navigate('PickupVerification', { orderId })}
          />
        </View>

        <Text className="text-center text-[13px] font-medium text-ink/40">Ride safe · Wear your helmet · Follow traffic rules</Text>
      </View>
    </View>
  );
}

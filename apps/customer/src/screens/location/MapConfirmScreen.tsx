// "Drag map under a fixed center pin" pattern — the pin never moves, the map
// does, and we read the new center off onRegionChangeComplete. Standard
// delivery-app UX (Blinkit/Zepto/Swiggy all do this) and simpler than a
// draggable Marker: no drag-gesture conflicts with the map's own pan gesture.
//
// Needs a native map — react-native-maps is not bundled in plain Expo Go as
// of SDK 52+, this screen requires a development build (`npx expo run:ios` /
// EAS dev client) to actually render. See src/screens/location/README.md.

import { ArrowLeft01Icon, GpsSignal01Icon, Location01Icon } from '@hugeicons/core-free-icons';
import { useRef, useState } from 'react';
import { Pressable, Text, View, type LayoutChangeEvent } from 'react-native';
import MapView, { type Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/AppIcon';
import { PrimaryButton } from '../../components/PrimaryButton';
import { getCurrentCoordinates, reverseGeocode } from '../../location/geocoding';
import { useLocationStore } from '../../store/useLocationStore';
import { colors } from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'MapConfirm'>;

const DELTA = 0.006; // ~500m span — close enough to place a pin on a specific house
const DEFAULT_SHEET_HEIGHT = 230; // fallback until onLayout reports the real height

export function MapConfirmScreen({ route, navigation }: Props) {
  const { latitude, longitude, addressLabel: initialLabel, city: initialCity, intent } = route.params;
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const [center, setCenter] = useState({ latitude, longitude });
  const [addressLabel, setAddressLabel] = useState(initialLabel);
  const [city, setCity] = useState(initialCity);
  const [resolving, setResolving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [sheetHeight, setSheetHeight] = useState(DEFAULT_SHEET_HEIGHT);
  const setLocation = useLocationStore((s) => s.setLocation);

  function handleSheetLayout(e: LayoutChangeEvent) {
    setSheetHeight(e.nativeEvent.layout.height);
  }

  async function handleRegionSettled(region: Region) {
    const next = { latitude: region.latitude, longitude: region.longitude };
    setCenter(next);
    setResolving(true);
    try {
      const resolved = await reverseGeocode(next);
      setAddressLabel(resolved.addressLabel);
      setCity(resolved.city);
    } catch {
      // keep the previous label — a failed reverse-geocode shouldn't block confirming
    } finally {
      setResolving(false);
    }
  }

  async function handleGoToCurrentLocation() {
    try {
      const coords = await getCurrentCoordinates();
      mapRef.current?.animateToRegion({ ...coords, latitudeDelta: DELTA, longitudeDelta: DELTA }, 400);
    } catch {
      // silently ignore — the pill is a convenience, not a required action
    }
  }

  async function handleConfirm() {
    setConfirming(true);
    try {
      if (intent === 'address-book') {
        // A real saved address, not the ambient "what area am I browsing"
        // location — AddressFormScreen collects the rest (name/phone/
        // landmark/label/instructions) and is the one that actually POSTs
        // it. Pushed, not reset — Checkout (further back in this same
        // stack) is where this flow needs to land afterward.
        navigation.navigate('AddressForm', { ...center, addressLabel, city });
        return;
      }
      await setLocation({ ...center, addressLabel, city });
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    } finally {
      setConfirming(false);
    }
  }

  return (
    <View className="flex-1 bg-white">
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={{ latitude, longitude, latitudeDelta: DELTA, longitudeDelta: DELTA }}
        onRegionChangeComplete={handleRegionSettled}
      />

      {/* fixed center pin — the map moves under it, it never moves itself */}
      <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
        <View className="mb-6 items-center">
          <View className="h-16 w-16 rounded-full bg-lime/20" />
        </View>
      </View>
      <View pointerEvents="none" className="absolute left-1/2 top-1/2 -ml-4 -mt-8">
        <AppIcon icon={Location01Icon} size={32} color={colors.ink} />
      </View>

      <Pressable
        onPress={() => navigation.goBack()}
        hitSlop={12}
        style={{ top: insets.top + 12 }}
        className="absolute left-4 h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm shadow-black/10"
      >
        <AppIcon icon={ArrowLeft01Icon} size={20} color={colors.ink} />
      </Pressable>

      <Pressable
        onPress={handleGoToCurrentLocation}
        style={{ bottom: sheetHeight + 16 }}
        className="absolute right-4 flex-row items-center gap-1.5 rounded-full border border-lime bg-white px-4 py-2.5 shadow-sm shadow-black/10"
      >
        <AppIcon icon={GpsSignal01Icon} size={16} color={colors.limeDeep} />
        <Text className="text-sm font-semibold text-lime-deep">Current location</Text>
      </Pressable>

      <View
        onLayout={handleSheetLayout}
        className="absolute bottom-0 w-full gap-4 rounded-t-3xl bg-white px-6 pb-safe pt-5 shadow-sm shadow-black/10"
      >
        <Text className="text-sm font-semibold text-ink/60">Delivering your order to</Text>
        <View className="flex-row items-center gap-3 rounded-2xl border border-mist bg-mist px-4 py-3">
          <AppIcon icon={Location01Icon} size={18} color={colors.ink} />
          <Text className="flex-1 text-[15px] text-ink" numberOfLines={2}>
            {resolving ? 'Locating…' : addressLabel}
          </Text>
        </View>
        <PrimaryButton label="Confirm location" onPress={handleConfirm} loading={confirming} disabled={resolving} />
      </View>
    </View>
  );
}

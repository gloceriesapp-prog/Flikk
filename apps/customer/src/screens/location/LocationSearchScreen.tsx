// One single screen for picking a delivery location — search bar overlaid
// on a live map with a fixed center pin, same "map moves under a pin that
// never moves" pattern Blinkit/Zepto/Swiggy all use (read the new center
// off onRegionChangeComplete, no draggable Marker, no drag-gesture
// conflicts with the map's own pan gesture).
//
// This used to be two screens (a plain search list, then a separate
// MapConfirmScreen navigated to after a search/GPS fix) — merged into one
// so map + confirm is always visible immediately, no dead middle page.
// route.params.latitude/longitude/addressLabel/city are an optional
// starting point (LocationPermissionScreen passes real GPS coords straight
// in); omitted, the map opens centered on the default launch zone
// (Kaup/outer Udupi, CLAUDE.md) and waits for a search or the on-map
// "Current location" pill.
//
// Needs a native map — react-native-maps is not bundled in plain Expo Go as
// of SDK 52+, this screen requires a development build (`npx expo run:ios` /
// EAS dev client) to actually render. See src/screens/location/README.md.

import { ArrowLeft01Icon, ArrowRight01Icon, GpsSignal01Icon, Location01Icon, Search01Icon } from '@hugeicons/core-free-icons';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Text, TextInput, View, type LayoutChangeEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/AppIcon';
import { DismissKeyboardView } from '../../components/DismissKeyboardView';
import { distanceKm, geocodeAddress, getCurrentCoordinates, reverseGeocode, type Coordinates } from '../../location/geocoding';
import { GRAYSCALE_MAP_STYLE } from '../../location/mapStyle';
import { useLocationStore } from '../../store/useLocationStore';
import { colors } from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'LocationSearch'>;

const BUTTON_ACCENT = '#1447e6';
// Below this, "you're Xkm away" reads as noise, not a useful warning — a
// genuine cross-town/cross-zone pin (someone testing on a simulator with a
// stock US location, say) is the case worth flagging.
const FAR_FROM_CURRENT_KM = 5;

// ~350m span, tight enough to tell individual buildings apart on the pin
// screen (Blinkit/Instamart zoom this close on their own confirm map, not
// a whole-neighborhood view) while still settling fast on a device GPS fix.
const DELTA = 0.004;
const DEFAULT_SHEET_HEIGHT = 230; // fallback until onLayout reports the real height
// Kaup/outer Udupi — this app's only launch zone (CLAUDE.md) — is the
// sensible default center when no real coords were handed in yet.
const DEFAULT_CENTER = { latitude: 13.2167, longitude: 74.7469 };

export function LocationSearchScreen({ navigation, route }: Props) {
  const { intent, ...startingPoint } = route.params ?? {};
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const searchInputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState('');
  const [center, setCenter] = useState({
    latitude: startingPoint.latitude ?? DEFAULT_CENTER.latitude,
    longitude: startingPoint.longitude ?? DEFAULT_CENTER.longitude,
  });
  const [addressLabel, setAddressLabel] = useState(startingPoint.addressLabel ?? '');
  const [city, setCity] = useState(startingPoint.city ?? '');
  const [resolving, setResolving] = useState(!startingPoint.addressLabel);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheetHeight, setSheetHeight] = useState(DEFAULT_SHEET_HEIGHT);
  const [currentCoords, setCurrentCoords] = useState<Coordinates | null>(null);
  const setLocation = useLocationStore((s) => s.setLocation);

  // Best-effort, once — purely to power the "Xkm away from your current
  // location" sanity-check line below, never blocks anything if it fails
  // (permission denied, GPS off, whatever) since the map itself doesn't
  // need this to function.
  useEffect(() => {
    getCurrentCoordinates()
      .then(setCurrentCoords)
      .catch(() => {});
  }, []);

  const distanceFromCurrent = currentCoords ? distanceKm(currentCoords, center) : null;

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

  async function handleSearch() {
    if (!query.trim()) return;
    setError(null);
    try {
      const coords = await geocodeAddress(query.trim());
      if (!coords) {
        setError("Couldn't find that location. Try a different search.");
        return;
      }
      mapRef.current?.animateToRegion({ ...coords, latitudeDelta: DELTA, longitudeDelta: DELTA }, 400);
      // Typed text stays the address label (that's what the user actually
      // searched for) until the map settles and reverse-geocodes the real
      // pin position — onRegionChangeComplete overwrites it right after.
      setAddressLabel(query.trim());
    } catch {
      setError('Search failed. Please try again.');
    }
  }

  async function handleGoToCurrentLocation() {
    setError(null);
    try {
      const coords = await getCurrentCoordinates();
      mapRef.current?.animateToRegion({ ...coords, latitudeDelta: DELTA, longitudeDelta: DELTA }, 400);
    } catch {
      setError('Could not get your location. Please try searching instead.');
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
    <DismissKeyboardView>
      <View className="flex-1 bg-white">
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          // Android only — react-native-maps falls back to Apple Maps on
          // iOS regardless (no iOS Google Maps key configured, see
          // app.config.js's own note), and customMapStyle has no effect
          // there either way.
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          customMapStyle={Platform.OS === 'android' ? GRAYSCALE_MAP_STYLE : undefined}
          initialRegion={{ ...center, latitudeDelta: DELTA, longitudeDelta: DELTA }}
          onRegionChangeComplete={handleRegionSettled}
        />

        {/* Subtle scrim over the whole map — pure decoration (masking, not a
            real map layer), keeps the pin/callout/sheet as the visual focus
            instead of competing with full-saturation map tiles underneath.
            Heavier toward the bottom, where the white sheet sits, so the
            map fades out right where it meets that sheet rather than
            cutting off abruptly. */}
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.16)']}
          locations={[0, 0.45, 1]}
          className="absolute inset-0"
        />

        {/* Separate white wash behind the status bar/header/search bar —
            same masking idea as the bottom scrim, but opaque-ish white
            instead of dark, since it's sitting under dark text/icons
            rather than a white sheet. Fades out well above the pin so it
            never dulls the part of the map someone's actually placing the
            pin on. */}
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(255,255,255,0.85)', 'rgba(255,255,255,0)']}
          style={{ height: insets.top + 150 }}
          className="absolute left-0 right-0 top-0"
        />

        {/* fixed center pin — exactly screen-center, since that's the point
            onRegionChangeComplete reads back as the map's new center. The
            callout above it is positioned independently (translateY off
            the same center) so it never nudges the pin itself off-anchor. */}
        <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
          <View className="h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: '#155DFC26' }}>
            <View className="h-9 w-9 items-center justify-center rounded-full border-[3px] border-white bg-[#155DFC] shadow-sm shadow-black/20">
              <View className="h-2.5 w-2.5 rounded-full bg-white" />
            </View>
          </View>
        </View>

        <View
          pointerEvents="none"
          style={{ top: '50%', transform: [{ translateY: -108 }] }}
          className="absolute left-6 right-6 items-center"
        >
          <View className="rounded-xl bg-ink px-3.5 py-2 shadow-sm shadow-black/20">
            <Text className="text-center text-[13px] font-bold text-white">Your order will be delivered here</Text>
            <Text className="text-center text-[11.5px] text-white/70">Move pin to your exact location</Text>
          </View>
          <View className="-mt-[3px] h-2.5 w-2.5 rotate-45 bg-ink" />
        </View>

        <View style={{ top: insets.top + 12 }} className="absolute left-4 right-4 flex-row items-center gap-2.5">
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={12}
            className="h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm shadow-black/10"
          >
            <AppIcon icon={ArrowLeft01Icon} size={20} color={colors.ink} />
          </Pressable>
          <Text className="text-lg font-medium text-ink">Select delivery address</Text>
        </View>

        <View style={{ top: insets.top + 68 }} className="absolute left-4 right-4 h-[52px] flex-row items-center rounded-full bg-white px-4 shadow-sm shadow-black/10">
          <View className="pr-2">
            <AppIcon icon={Search01Icon} size={18} color={colors.ink} />
          </View>
          <TextInput
            ref={searchInputRef}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            placeholder="Search for area, street name..."
            placeholderTextColor="#9AA5A3"
            textAlignVertical="center"
            className="h-full flex-1 py-0 text-base leading-tight text-ink"
          />
        </View>

        {error ? (
          <View style={{ top: insets.top + 128 }} className="absolute left-4 right-4 rounded-xl bg-danger/10 px-4 py-2">
            <Text className="text-[13px] text-danger">{error}</Text>
          </View>
        ) : null}

        <Pressable
          onPress={handleGoToCurrentLocation}
          style={{ bottom: sheetHeight + 32 }}
          className="absolute right-4 flex-row items-center gap-2 rounded-full bg-lime-soft px-4 py-3 shadow-sm shadow-black/15"
        >
          <View className="h-6 w-6 items-center justify-center rounded-full bg-white">
            <AppIcon icon={GpsSignal01Icon} size={13} color={colors.limeDeep} />
          </View>
          <Text className="text-sm font-bold text-lime-deep">Current location</Text>
        </Pressable>

        <View
          onLayout={handleSheetLayout}
          style={{ bottom: insets.bottom + 16 }}
          className="absolute left-3 right-3 gap-3.5 rounded-3xl bg-white px-5 pb-5 pt-5 shadow-sm shadow-black/10"
        >
          <Text className="text-[17px] font-bold text-ink">Delivering your order to</Text>

          <View className="gap-2 rounded-2xl border border-mist px-4 py-3.5">
            <View className="flex-row items-center gap-3">
              <View className="w-8 items-center">
                <AppIcon icon={Location01Icon} size={28} color={colors.ink} />
                <View className="-mt-1.5 h-2 w-4 rounded-full" style={{ backgroundColor: '#155DFC33' }} />
              </View>
              <View className="flex-1">
                {resolving ? (
                  <Text className="text-[15px] text-ink/50">Locating…</Text>
                ) : (
                  <>
                    <Text className="text-[15px] font-bold text-ink" numberOfLines={1}>
                      {addressLabel.split(',')[0] || 'Move the pin to your location'}
                    </Text>
                    {city ? (
                      <Text className="text-[13px] text-ink/45" numberOfLines={1}>
                        {city}
                      </Text>
                    ) : null}
                  </>
                )}
              </View>
              <Pressable
                onPress={() => searchInputRef.current?.focus()}
                hitSlop={8}
                className="rounded-full border border-mist px-2.5 py-1"
              >
                <Text className="text-[12px] font-bold" style={{ color: BUTTON_ACCENT }}>
                  Change
                </Text>
              </Pressable>
            </View>

            {distanceFromCurrent !== null && distanceFromCurrent >= FAR_FROM_CURRENT_KM ? (
              <Text className="text-[12.5px] font-medium text-danger">
                Pin location is {distanceFromCurrent.toFixed(1)}km away from your current location
              </Text>
            ) : null}
          </View>

          <Pressable
            onPress={handleConfirm}
            disabled={resolving || confirming}
            className="flex-row items-center justify-center gap-2 rounded-2xl py-4"
            style={{ backgroundColor: resolving || confirming ? `${BUTTON_ACCENT}80` : BUTTON_ACCENT }}
          >
            {confirming ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text className="text-lg font-semibold text-white">Confirm location</Text>
                <AppIcon icon={ArrowRight01Icon} size={20} color="#FFFFFF" />
              </>
            )}
          </Pressable>
        </View>
      </View>
    </DismissKeyboardView>
  );
}

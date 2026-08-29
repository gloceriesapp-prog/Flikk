// Full-screen "confirm map pin" step — the same drag-a-fixed-center-pin
// pattern Blinkit/Zepto/Swiggy all use for address confirm: the pin never
// moves, the map pans underneath it, and the address label above the pin
// re-resolves once panning settles. Reached only from StoreSetupScreen's
// "Enable location" button (see StoreLocationCard.tsx); hands its result
// back via the onConfirm callback passed in route.params, not a store —
// this stack is never deep-linked so a one-shot callback is the smaller
// diff than a shared slice.

import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import MapView, { type Region } from 'react-native-maps';
import { BlurView } from 'expo-blur';
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Cancel01Icon,
  GpsSignal01Icon,
  Location01Icon,
  Location04Icon,
  Search01Icon,
} from '@hugeicons/core-free-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/AppIcon';
import { DismissKeyboardView } from '../../components/DismissKeyboardView';
import { PrimaryButton } from '../../components/PrimaryButton';
import {
  getCurrentCoordinates,
  requestLocationPermission,
  reverseGeocodeAddress,
  reverseGeocodeDistrict,
  searchPlaces,
  type Coordinates,
  type PlaceSuggestion,
} from '../../location/geocoding';
import { colors } from '../../theme/tokens';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'LocationPin'>;

// Kaup/outer Udupi — this app's one launch zone (CLAUDE.md: single-zone
// only). Used only if permission is denied outright, so the map still has
// something sensible centered instead of the 0,0 Atlantic default.
const LAUNCH_ZONE_FALLBACK: Coordinates = { latitude: 13.2158, longitude: 74.7431 };
const PIN_DELTA = 0.004;

// Blinkit/Instamart's pin-confirm map reads clean because Google's style
// strips POI icons/shop-dots and transit clutter, leaving only roads and
// building footprints — this is that same style JSON, applied via
// react-native-maps' customMapStyle (Google provider on Android only;
// iOS/Apple Maps has no equivalent style-JSON API, so showsPointsOfInterest
// below is what declutters it there instead).
const MAP_STYLE = [
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
];

// Straight-line (not road) distance, good enough for the "does this pin
// look like a mis-tap" sanity check below — a full routing-distance call
// would need another API/cost for a number that's only ever a rough flag.
function distanceKm(a: Coordinates, b: Coordinates): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const FAR_PIN_THRESHOLD_KM = 5;

export function LocationPinScreen({ navigation, route }: Props) {
  const { initialCoordinates, onConfirm } = route.params;
  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState<Region | null>(
    initialCoordinates
      ? { ...initialCoordinates, latitudeDelta: PIN_DELTA, longitudeDelta: PIN_DELTA }
      : null
  );
  const [addressLabel, setAddressLabel] = useState<string | null>(null);
  const [locating, setLocating] = useState(!initialCoordinates);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [tooltipDismissed, setTooltipDismissed] = useState(false);
  const [deviceCoords, setDeviceCoords] = useState<Coordinates | null>(null);
  const startedRef = useRef(false);
  const searchInputRef = useRef<TextInput>(null);

  const resolveLabel = useCallback(async (coords: Coordinates) => {
    const label = await reverseGeocodeAddress(coords);
    setAddressLabel(label);
  }, []);

  const moveTo = useCallback(
    async (coords: Coordinates) => {
      const nextRegion = { ...coords, latitudeDelta: PIN_DELTA, longitudeDelta: PIN_DELTA };
      setRegion(nextRegion);
      mapRef.current?.animateToRegion(nextRegion, 400);
      await resolveLabel(coords);
    },
    [resolveLabel]
  );

  const goToCurrentLocation = useCallback(async () => {
    setLocating(true);
    try {
      const granted = await requestLocationPermission();
      const coords = granted ? await getCurrentCoordinates() : LAUNCH_ZONE_FALLBACK;
      if (granted) setDeviceCoords(coords);
      await moveTo(coords);
    } finally {
      setLocating(false);
    }
  }, [moveTo]);

  function handleSelectSearchResult(place: PlaceSuggestion) {
    setSearchQuery('');
    setSearchResults([]);
    moveTo(place.coordinates);
  }

  useEffect(() => {
    const trimmed = searchQuery.trim();
    const tooShort = trimmed.length < 3;
    const timeout = setTimeout(
      async () => {
        if (tooShort) {
          setSearchResults([]);
          setSearching(false);
          return;
        }
        setSearching(true);
        const results = await searchPlaces(trimmed);
        setSearchResults(results);
        setSearching(false);
      },
      tooShort ? 0 : 350
    );
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    // Deferred to a real async tick (not the effect body directly) — same
    // fix as the incoming-order-alert timer's own note on why side effects
    // belong in a callback, not synchronously inside the effect.
    const timeout = setTimeout(() => {
      if (initialCoordinates) {
        resolveLabel(initialCoordinates);
        // Still worth knowing the device's real position even when the pin
        // starts elsewhere (e.g. a search result) — that's what the "how
        // far is this pin from you" sanity check below compares against.
        getCurrentCoordinates()
          .then(setDeviceCoords)
          .catch(() => {});
      } else {
        goToCurrentLocation();
      }
    }, 0);
    return () => clearTimeout(timeout);
    // Fires once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleRegionChangeComplete(nextRegion: Region) {
    setRegion(nextRegion);
    resolveLabel(nextRegion);
  }

  async function handleConfirm() {
    if (!region) return;
    const coords: Coordinates = { latitude: region.latitude, longitude: region.longitude };
    const district = (await reverseGeocodeDistrict(coords)) ?? 'Udupi';
    onConfirm(coords, district);
    navigation.goBack();
  }

  const [primaryLabel, ...rest] = (addressLabel ?? '').split(', ');
  const secondaryLabel = rest.join(', ');

  return (
    // Keyboard was covering the "Confirm location" bar below when the
    // search input above is focused (no keyboard-avoidance at all) — same
    // fix/reasoning as LoginScreen.tsx's own note.
    <DismissKeyboardView>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-white">
      <View className="flex-1">
        {region ? (
          <MapView
            ref={mapRef}
            style={{ flex: 1 }}
            mapType="standard"
            initialRegion={region}
            onRegionChangeComplete={handleRegionChangeComplete}
            showsPointsOfInterests={false}
            showsCompass={false}
            showsIndoors={false}
            customMapStyle={MAP_STYLE}
          />
        ) : (
          <View className="flex-1 items-center justify-center bg-mist">
            <ActivityIndicator color={colors.limeDeep} />
          </View>
        )}

        {/* Fixed center pin — the map pans underneath it, it never moves. */}
        {region && (
          <View pointerEvents="box-none" className="absolute inset-0 items-center justify-center" style={{ marginBottom: 34 }}>
            {!tooltipDismissed && (
              <View pointerEvents="box-none" className="mb-2 flex-row items-center gap-2 rounded-xl bg-ink px-3 py-2">
                <Text className="text-xs font-semibold text-white">Move the pin to change location</Text>
                <Pressable onPress={() => setTooltipDismissed(true)} hitSlop={8}>
                  <AppIcon icon={Cancel01Icon} size={13} color="#FFFFFF" />
                </Pressable>
              </View>
            )}
            <View className="h-9 w-9 items-center justify-center rounded-full bg-ink shadow-lg">
              <AppIcon icon={Location01Icon} size={18} color="#FFFFFF" strokeWidth={2} />
            </View>
            <View className="mt-0.5 h-2 w-2 rounded-full bg-ink/30" />
          </View>
        )}

        <View className="absolute left-4 right-4 top-4 flex-row items-center gap-3 pt-safe">
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={12}
            className="h-11 w-11 items-center justify-center rounded-full bg-white shadow-md"
          >
            <AppIcon icon={ArrowLeft01Icon} size={20} color={colors.ink} />
          </Pressable>

          <View className="flex-1">
            <View className="flex-row items-center gap-2 rounded-2xl bg-white px-4 py-3.5 shadow-md">
              <TextInput
                ref={searchInputRef}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search an area or address"
                placeholderTextColor="#9AA5A3"
                className="flex-1 text-sm font-medium text-ink"
              />
              {searching ? (
                <ActivityIndicator size="small" color={colors.limeDeep} />
              ) : (
                <AppIcon icon={Search01Icon} size={18} color={`${colors.ink}80`} />
              )}
            </View>

            {searchResults.length > 0 && (
              <ScrollView
                style={{ maxHeight: 260 }}
                className="mt-2 rounded-2xl bg-white shadow-md"
                keyboardShouldPersistTaps="handled"
              >
                {searchResults.map((place, index) => (
                  <Pressable
                    key={`${place.label}-${index}`}
                    onPress={() => handleSelectSearchResult(place)}
                    className="flex-row items-center gap-3 border-b border-gray-100 px-4 py-3.5"
                    style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                  >
                    <AppIcon icon={Location04Icon} size={16} color={`${colors.ink}70`} />
                    <Text className="flex-1 text-sm font-medium text-ink">{place.label}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>
        </View>

        <Pressable
          onPress={goToCurrentLocation}
          disabled={locating}
          className="absolute bottom-4 left-0 right-0 mx-auto w-56 flex-row items-center justify-center gap-2 self-center rounded-full bg-white px-4 py-3 shadow-md"
          style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
        >
          {locating ? (
            <ActivityIndicator size="small" color={colors.limeDeep} />
          ) : (
            <AppIcon icon={GpsSignal01Icon} size={15} color={colors.limeDeep} />
          )}
          <Text className="text-sm font-bold text-ink">Current Location</Text>
        </Pressable>
      </View>

      <BlurView intensity={80} tint="light" style={{ borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' }}>
        <View style={{ backgroundColor: 'rgba(255,255,255,0.65)' }} className="gap-3 border-t border-white/60 px-5 pb-safe pt-5">
          <Text className="text-sm font-medium text-ink/50">Setting up your store at</Text>

          <View className="flex-row items-center gap-2.5 rounded-2xl border border-white/70 bg-white/60 px-3.5 py-3">
            <View className="h-8 w-8 items-center justify-center rounded-full bg-lime-soft">
              <AppIcon icon={Location01Icon} size={14} color={colors.limeDeep} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-ink" numberOfLines={1}>
                {primaryLabel || 'Move the map to set your pin'}
              </Text>
              {secondaryLabel.length > 0 && (
                <Text className="text-xs font-medium text-ink/50" numberOfLines={1}>
                  {secondaryLabel}
                </Text>
              )}
            </View>
            <Pressable
              onPress={() => searchInputRef.current?.focus()}
              hitSlop={8}
              className="rounded-full border border-lime-deep px-3 py-1.5"
            >
              <Text className="text-xs font-bold text-lime-deep">Change</Text>
            </Pressable>
          </View>

          {region && deviceCoords && distanceKm(region, deviceCoords) > FAR_PIN_THRESHOLD_KM && (
            <Text className="text-xs font-semibold text-danger">
              Pin location is {distanceKm(region, deviceCoords).toFixed(1)} km away from your current location
            </Text>
          )}

          <PrimaryButton
            label="Confirm location"
            onPress={handleConfirm}
            disabled={!region}
            loading={locating && !region}
            trailingIcon={ArrowRight01Icon}
          />
        </View>
      </BlurView>
    </KeyboardAvoidingView>
    </DismissKeyboardView>
  );
}

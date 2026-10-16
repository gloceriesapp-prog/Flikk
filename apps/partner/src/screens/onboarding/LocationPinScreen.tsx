// Full-screen "confirm map pin" step — the drag-a-fixed-center-pin pattern
// Blinkit/Zepto/Swiggy use for address confirm: the pin never moves, the map
// pans underneath it, and the address re-resolves once panning settles.
// Reached from StoreLocationScreen's map card and from useChangeStoreLocation
// post-approval; hands its result back via the onConfirm callback in
// route.params.
//
// Map UI is ported from apps/customer's LocationSearchScreen (grayscale
// Google style, straight-down 18.5 zoom camera, a steady filtered blue dot
// drawn by useLiveLocation, a tip-anchored teardrop pin, follow-the-dot) so
// both apps' maps read identically. Partner keeps its own geocoding shape
// (reverseGeocodeAddress -> string, PlaceSuggestion search that already
// carries coordinates) and its own confirm contract (district + addressLine);
// only the map's look and settle-once behaviour come from customer. Accent is
// colors.primary (#155DFC), not the customer app's blue.

import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import MapView, { Circle, Marker, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import Constants from 'expo-constants';
import { isRunningInExpoGo } from 'expo';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft01Icon, ArrowRight01Icon, GpsSignal01Icon, Location01Icon, Location04Icon, Search01Icon } from '@hugeicons/core-free-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/AppIcon';
import { AppImage as Image } from '../../components/AppImage';
import { DismissKeyboardView } from '../../components/DismissKeyboardView';
import {
  distanceKm,
  getCurrentCoordinates,
  requestLocationPermission,
  reverseGeocodeAddress,
  reverseGeocodeDistrict,
  searchPlaces,
  type Coordinates,
  type PlaceSuggestion,
} from '../../location/geocoding';
import { distanceMeters } from '../../location/locationFilter';
import { GRAYSCALE_MAP_STYLE } from '../../location/mapStyle';
import { LocationRequestGate } from '../../location/requestGate';
import { confirmStorePin } from '../../location/storePin';
import { getSessionEpoch, isCurrentSession } from '../../store/sessionScope';
import { useLiveLocation } from '../../location/useLiveLocation';
import { colors } from '../../theme/tokens';
import { storageUrl } from '../../utils/storageUrl';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'LocationPin'>;

const ACCENT = colors.primary;

// Straight-down (pitch 0) — customer's own note explains why a tilted 3D
// camera is wrong for a pin-precision screen.
const INITIAL_PITCH = 0;
const INITIAL_ZOOM = 18.5;
const INITIAL_ALTITUDE = 300;
// Kaup/outer Udupi — this app's one launch zone (CLAUDE.md single-zone).
const DEFAULT_CENTER: Coordinates = { latitude: 13.2158, longitude: 74.7431 };
const FOLLOW_MIN_MOVE_M = 3;
const FOLLOW_MIN_INTERVAL_MS = 1500;
const REGEOCODE_MIN_MOVE_M = 12;
const GEOCODE_DEBOUNCE_MS = 350;
const VAGUE_ACCURACY_M = 25;
const FAR_PIN_THRESHOLD_KM = 5;

// Tip-anchored teardrop pin — the true selected coordinate is the pin's TIP,
// not its visual centre, so the image box is anchored by that point. Ratio
// measured off the real asset, same as customer's LocationSearchScreen.
const PIN_IMAGE_URI = storageUrl('Images/gps.png');
const PIN_SIZE = 64;
const PIN_TIP_RATIO = 0.926;

// Google Maps on Android; iOS uses Apple Maps unless a separate iOS SDK
// credential was included in the native build.
const HAS_IOS_GOOGLE_MAPS = Constants.expoConfig?.extra?.hasIosGoogleMaps === true;
const USES_GOOGLE_MAPS = Platform.OS === 'android' || HAS_IOS_GOOGLE_MAPS;

// react-native-maps' native view isn't in the Expo Go SDK 57 runtime — mounting
// <MapView> hard-crashes there. In Expo Go we render a mapless pin flow instead
// (search + current-location set the coordinate directly, since there's no
// camera to pan), so onboarding still completes. Real builds render the map.
const IN_EXPO_GO = isRunningInExpoGo();

export function LocationPinScreen({ navigation, route }: Props) {
  const { initialCoordinates, onConfirm } = route.params;
  const insets = useSafeAreaInsets();
  const session = useRef(getSessionEpoch());
  const mapRef = useRef<MapView>(null);
  const searchInputRef = useRef<TextInput>(null);

  const [center, setCenter] = useState<Coordinates>(initialCoordinates ?? DEFAULT_CENTER);
  const [addressLabel, setAddressLabel] = useState<string | null>(null);
  const [resolving, setResolving] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const confirmingRef = useRef(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [mapAreaHeight, setMapAreaHeight] = useState(0);
  // mapPadding stays undefined until onMapReady — pushing it before the
  // native GoogleMap object exists throws a native NPE on Android (customer's
  // own note).
  const [mapReady, setMapReady] = useState(false);
  const [cardHeight, setCardHeight] = useState(0);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  // Expo-Go-only: tracks whether the owner has actually chosen a coordinate
  // (search result or current location) so Confirm isn't enabled on the bare
  // default-zone center. Unused on the real map path.
  const [fallbackPicked, setFallbackPicked] = useState(initialCoordinates != null);

  const liveFix = useLiveLocation(hasLocationPermission);
  const dotCoordinate = liveFix ? { latitude: liveFix.latitude, longitude: liveFix.longitude } : null;

  // Follow the blue dot only when we opened without a seeded pin (first-time
  // onboarding); when editing an existing pin, centre on it and stay put.
  const followDot = useRef(initialCoordinates == null);
  const lastFollowMoveAt = useRef(0);
  const resolvedAt = useRef<Coordinates | null>(null);
  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pinRequests = useRef(new LocationRequestGate());

  useEffect(() => () => {
    pinRequests.current.invalidate();
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
  }, []);

  // Best-effort permission for the blue dot + follow. By design permission is
  // already granted before this screen opens (StoreLocationScreen /
  // useChangeStoreLocation request it on a dedicated step first), so this
  // resolves instantly with no dialog here — the structural crash fix. The
  // blue dot comes from useLiveLocation's watchPositionAsync, never an
  // immediate single-shot getCurrentPositionAsync on mount.
  useEffect(() => {
    requestLocationPermission().then(setHasLocationPermission).catch(() => setHasLocationPermission(false));
  }, []);

  function moveCameraTo(coords: Coordinates, resetZoom: boolean) {
    const target = { latitude: coords.latitude, longitude: coords.longitude };
    mapRef.current?.animateCamera(
      resetZoom ? { center: target, zoom: INITIAL_ZOOM, heading: 0, pitch: INITIAL_PITCH } : { center: target },
      { duration: resetZoom ? 400 : 300 },
    );
  }

  // Keep the pin glued to the blue dot while following.
  useEffect(() => {
    if (!liveFix || !followDot.current || !mapReady) return;
    const isFirstMove = lastFollowMoveAt.current === 0;
    if (!isFirstMove && distanceMeters(center, liveFix) < FOLLOW_MIN_MOVE_M) return;
    const now = Date.now();
    if (!isFirstMove && now - lastFollowMoveAt.current < FOLLOW_MIN_INTERVAL_MS) return;
    lastFollowMoveAt.current = now;
    moveCameraTo(liveFix, isFirstMove);
  }, [liveFix, mapReady, center]);

  // Debounced place search — PlaceSuggestion already carries coordinates
  // (partner's searchPlaces), so selecting one moves straight there, no extra
  // geocode round-trip.
  useEffect(() => {
    const trimmed = searchQuery.trim();
    let active = true;
    const timeout = setTimeout(async () => {
      if (trimmed.length < 3) {
        setSearchResults([]);
        setSearching(false);
        return;
      }
      setSearching(true);
      const results = await searchPlaces(trimmed);
      if (active) {
        setSearchResults(results);
        setSearching(false);
      }
    }, 350);
    return () => { active = false; clearTimeout(timeout); };
  }, [searchQuery]);

  // Shared by mapPadding and the pin's own vertical anchor — MUST be the same
  // number in both (customer's own note on why a flat top:'50%' is off by half
  // the padding once mapPadding is non-zero).
  const bottomPadding = cardHeight + insets.bottom + 16 + 16;
  const pinAnchorTop = (mapAreaHeight - bottomPadding) / 2;

  // Load the address ONCE per settled point — never on every drag frame, and
  // never re-fired for a sub-REGEOCODE_MIN_MOVE_M nudge. Wrapped so a geocoder
  // rejection can never bubble up and crash onboarding.
  const resolveLabel = useCallback(async (coords: Coordinates, ticket: number) => {
    try {
      const label = await reverseGeocodeAddress(coords);
      if (!pinRequests.current.current(ticket)) return;
      resolvedAt.current = coords;
      setAddressLabel(label);
    } catch {
      if (!pinRequests.current.current(ticket)) return;
      resolvedAt.current = null;
      setAddressLabel(null);
    } finally {
      if (pinRequests.current.current(ticket)) setResolving(false);
    }
  }, []);

  async function handleRegionSettled(region: Region) {
    // The camera target is the point under the pin tip; the region's own
    // centre is the middle of the whole map view (including the strip behind
    // the card), so prefer the camera centre when available.
    const camera = await mapRef.current?.getCamera().catch(() => null);
    const next = camera?.center
      ? { latitude: camera.center.latitude, longitude: camera.center.longitude }
      : { latitude: region.latitude, longitude: region.longitude };
    setCenter(next);
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    if (resolvedAt.current && distanceMeters(resolvedAt.current, next) < REGEOCODE_MIN_MOVE_M) {
      pinRequests.current.invalidate();
      setResolving(false);
      return;
    }
    const ticket = pinRequests.current.begin();
    setResolving(true);
    geocodeTimer.current = setTimeout(() => { void resolveLabel(next, ticket); }, GEOCODE_DEBOUNCE_MS);
  }

  function handleSelectSearchResult(place: PlaceSuggestion) {
    setSearchQuery('');
    setSearchResults([]);
    searchInputRef.current?.blur();
    followDot.current = false;
    setAddressLabel(place.label);
    moveCameraTo(place.coordinates, true);
  }

  async function handleGoToCurrentLocation() {
    try {
      // Same filtered position the blue dot is drawn from, so the pin lands
      // exactly on the dot; a one-off hardened read only before the first
      // live fix.
      let coords: Coordinates | null = liveFix;
      if (!coords) {
        const granted = hasLocationPermission || (await requestLocationPermission());
        if (!granted) return;
        setHasLocationPermission(true);
        coords = await getCurrentCoordinates();
      }
      followDot.current = true;
      lastFollowMoveAt.current = Date.now();
      moveCameraTo(coords, true);
    } catch {
      // Location unavailable — the map stays where it is, pin still draggable.
    }
  }

  async function handleConfirm() {
    if (confirmingRef.current || (resolving && !IN_EXPO_GO)) return;
    confirmingRef.current = true;
    setConfirming(true);
    setConfirmError(null);
    const selected = { ...center };
    try {
      await confirmStorePin({ coordinates: selected, addressLabel, resolveDistrict: reverseGeocodeDistrict,
        save: onConfirm, close: () => navigation.goBack(), isCurrent: () => isCurrentSession(session.current) });
    } catch (error) {
      setConfirmError(error instanceof Error ? error.message : 'Could not save this location. Please retry.');
    } finally {
      confirmingRef.current = false;
      setConfirming(false);
    }
  }

  // Expo-Go fallback handlers: no map camera to pan, so set the coordinate
  // directly off the chosen place / current fix. Mirror the real handlers'
  // results (center + addressLabel) so handleConfirm works unchanged.
  function pickFallbackPlace(place: PlaceSuggestion) {
    setSearchQuery('');
    setSearchResults([]);
    searchInputRef.current?.blur();
    setCenter(place.coordinates);
    setAddressLabel(place.label);
    setFallbackPicked(true);
  }

  async function useFallbackCurrentLocation() {
    try {
      const granted = hasLocationPermission || (await requestLocationPermission());
      if (!granted) return;
      setHasLocationPermission(true);
      const coords = await getCurrentCoordinates();
      setCenter(coords);
      const label = await reverseGeocodeAddress(coords).catch(() => null);
      setAddressLabel(label);
      setFallbackPicked(true);
    } catch {
      // Location unavailable — keep any prior pick.
    }
  }

  const distanceFromDevice = liveFix ? distanceKm(liveFix, center) : null;
  const [primaryLabel, ...rest] = (addressLabel ?? '').split(', ');
  const secondaryLabel = rest.join(', ');

  // Expo Go: render the mapless pin flow instead of <MapView> (which would
  // crash). Search an address or use current location, then confirm.
  if (IN_EXPO_GO) {
    return (
      <DismissKeyboardView>
        <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
          <StatusBar style="dark" />

          <View className="flex-row items-center gap-2.5 px-4 pb-3 pt-3">
            <Pressable
              onPress={() => navigation.goBack()}
              hitSlop={12}
              className="h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white"
            >
              <AppIcon icon={ArrowLeft01Icon} size={20} color={colors.ink} />
            </Pressable>
            <View className="h-11 flex-1 flex-row items-center gap-2 rounded-full border border-gray-200 bg-white px-4">
              <TextInput
                ref={searchInputRef}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search an area or address"
                placeholderTextColor="#9AA5A3"
                className="h-full flex-1 py-0 text-sm font-medium text-ink"
              />
              {searching ? (
                <ActivityIndicator size="small" color={ACCENT} />
              ) : (
                <AppIcon icon={Search01Icon} size={18} color={`${colors.ink}80`} />
              )}
            </View>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 16 }}>
            {searchResults.length > 0 && (
              <View className="rounded-2xl bg-white shadow-md">
                {searchResults.map((place, index) => (
                  <Pressable
                    key={`${place.label}-${index}`}
                    onPress={() => pickFallbackPlace(place)}
                    className="flex-row items-center gap-3 border-b border-gray-100 px-4 py-3.5"
                    style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                  >
                    <AppIcon icon={Location04Icon} size={16} color={`${colors.ink}70`} />
                    <Text className="flex-1 text-sm font-medium text-ink">{place.label}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            {/* Why there's no interactive map in Expo Go. */}
            <View className="gap-2 rounded-3xl border p-5" style={{ borderColor: `${ACCENT}33`, backgroundColor: `${ACCENT}0D` }}>
              <View className="flex-row items-center gap-2">
                <View className="h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: `${ACCENT}1A` }}>
                  <AppIcon icon={Location01Icon} size={16} color={ACCENT} />
                </View>
                <Text className="text-[15px] font-semibold text-ink">Map needs a dev build</Text>
              </View>
              <Text className="text-[13px] font-medium leading-[19px] text-ink/60">
                The interactive map is not available in Expo Go. You can still set your store location — search an address above or use your current location, then confirm.
              </Text>
            </View>

            <Pressable
              onPress={useFallbackCurrentLocation}
              className="flex-row items-center justify-center gap-2 rounded-2xl py-3.5"
              style={({ pressed }) => ({ backgroundColor: ACCENT, opacity: pressed ? 0.9 : 1 })}
            >
              <AppIcon icon={GpsSignal01Icon} size={16} color="#FFFFFF" />
              <Text className="text-[14px] font-semibold text-white">Use my current location</Text>
            </Pressable>

            <View className="flex-row items-center gap-2.5 rounded-2xl border border-black/5 bg-white px-3.5 py-3">
              <View className="h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: `${ACCENT}14` }}>
                <AppIcon icon={Location01Icon} size={14} color={ACCENT} />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-ink" numberOfLines={1}>
                  {primaryLabel || 'No location selected yet'}
                </Text>
                {secondaryLabel.length > 0 && (
                  <Text className="text-xs font-medium text-ink/50" numberOfLines={1}>{secondaryLabel}</Text>
                )}
              </View>
            </View>

            {distanceFromDevice !== null && distanceFromDevice > FAR_PIN_THRESHOLD_KM && (
              <Text className="text-xs font-semibold text-danger">
                Pin location is {distanceFromDevice.toFixed(1)} km away from your current location
              </Text>
            )}
          </ScrollView>

          <View className="px-4" style={{ paddingBottom: insets.bottom + 16 }}>
            {confirmError && <Text accessibilityRole="alert" className="text-sm text-danger">{confirmError}</Text>}
            <Pressable
              onPress={handleConfirm}
              disabled={!fallbackPicked || confirming}
              className="h-[52px] flex-row items-center justify-center gap-1.5 rounded-full"
              accessibilityRole="button"
              accessibilityLabel="Confirm location"
              style={{ backgroundColor: !fallbackPicked || confirming ? '#A0B8F4' : ACCENT }}
            >
              {confirming ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text className="text-[15px] font-medium text-white">Confirm location</Text>
                  <AppIcon icon={ArrowRight01Icon} size={16} color="#FFFFFF" strokeWidth={2.2} />
                </>
              )}
            </Pressable>
          </View>
        </View>
      </DismissKeyboardView>
    );
  }

  return (
    <DismissKeyboardView>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View className="flex-1 bg-white">
        <StatusBar style="dark" />
        <View className="flex-1" onLayout={(e) => setMapAreaHeight(e.nativeEvent.layout.height)}>
          <MapView
            ref={mapRef}
            style={mapAreaHeight > 0 ? { width: '100%', height: mapAreaHeight } : { flex: 1 }}
            provider={USES_GOOGLE_MAPS ? PROVIDER_GOOGLE : undefined}
            customMapStyle={USES_GOOGLE_MAPS ? GRAYSCALE_MAP_STYLE : undefined}
            mapType={USES_GOOGLE_MAPS ? 'standard' : 'mutedStandard'}
            mapPadding={mapReady ? { top: 0, right: 0, bottom: bottomPadding, left: 0 } : undefined}
            onMapReady={() => setMapReady(true)}
            initialCamera={{ center, pitch: INITIAL_PITCH, heading: 0, zoom: INITIAL_ZOOM, altitude: INITIAL_ALTITUDE }}
            minZoomLevel={14}
            onPanDrag={() => {
              followDot.current = false;
              pinRequests.current.invalidate();
              if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
              setResolving(true);
            }}
            onRegionChangeComplete={handleRegionSettled}
            showsUserLocation={false}
            showsMyLocationButton={false}
            showsBuildings
            showsCompass={false}
            showsIndoors={false}
          >
            {liveFix && dotCoordinate ? (
              <>
                {liveFix.accuracy > 8 ? (
                  <Circle
                    center={dotCoordinate}
                    radius={liveFix.accuracy}
                    fillColor="rgba(21,93,252,0.12)"
                    strokeColor="rgba(21,93,252,0.25)"
                    strokeWidth={1}
                  />
                ) : null}
                <Marker coordinate={dotCoordinate} anchor={{ x: 0.5, y: 0.5 }} flat zIndex={1}>
                  <View style={styles.userDot} />
                </Marker>
              </>
            ) : null}
          </MapView>

          {/* Tip-anchored teardrop pin over the map's own visually-centred
              point (pinAnchorTop accounts for mapPadding). */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: pinAnchorTop,
              left: '50%',
              width: PIN_SIZE,
              height: PIN_SIZE,
              marginLeft: -PIN_SIZE / 2,
              marginTop: -PIN_SIZE * PIN_TIP_RATIO,
            }}
          >
            <Image source={{ uri: PIN_IMAGE_URI }} style={{ flex: 1 }} contentFit="contain" />
          </View>

          {/* Back button + search bar on one row. */}
          <View style={{ top: insets.top + 12 }} className="absolute left-4 right-4 flex-row items-center gap-2.5">
            <Pressable
              onPress={() => navigation.goBack()}
              hitSlop={12}
              className="h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white shadow-md"
            >
              <AppIcon icon={ArrowLeft01Icon} size={20} color={colors.ink} />
            </Pressable>

            <View className="flex-1">
              <View className="h-11 flex-row items-center gap-2 rounded-full border border-gray-200 bg-white px-4 shadow-md">
                <TextInput
                  ref={searchInputRef}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search an area or address"
                  placeholderTextColor="#9AA5A3"
                  className="h-full flex-1 py-0 text-sm font-medium text-ink"
                />
                {searching ? (
                  <ActivityIndicator size="small" color={ACCENT} />
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

          {/* "Use my current location" pill, sitting just above the card. */}
          <View
            pointerEvents="box-none"
            style={{ bottom: cardHeight + insets.bottom + 16 + 16 }}
            className="absolute left-0 right-0 items-center"
          >
            <Pressable
              onPress={handleGoToCurrentLocation}
              className="flex-row items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-md"
              style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
            >
              <AppIcon icon={GpsSignal01Icon} size={16} color={ACCENT} />
              <Text className="text-sm font-semibold" style={{ color: ACCENT }}>
                Use my current location
                {liveFix && liveFix.accuracy > VAGUE_ACCURACY_M ? ` (±${Math.round(liveFix.accuracy)} m)` : ''}
              </Text>
            </Pressable>
          </View>
        </View>
        {/* Solid white confirm card over the map — all four
            corners rounded, real left/right/bottom margin so the map peeks
            around it. Its measured height drives the pin anchor + mapPadding
            above, so it only ever grows (a shrink/grow would re-centre the
            map on every address). */}
        <View
          onLayout={(e) => { const h = Math.round(e.nativeEvent.layout.height); setCardHeight((prev) => (h > prev ? h : prev)); }}
          className="absolute bottom-0 left-4 right-4 overflow-hidden rounded-3xl shadow-lg shadow-black/25"
          style={{ marginBottom: insets.bottom + 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' }}
        >
          <View style={[StyleSheet.absoluteFill, { backgroundColor: '#FFFFFF' }]} />

          <View className="gap-3 px-5 pb-5 pt-4">
            <Text className="text-sm font-medium text-ink/50">Setting up your store at</Text>

            <View className="flex-row items-center gap-2.5 rounded-2xl border border-black/5 bg-white px-3.5 py-3">
              <View className="h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: `${ACCENT}14` }}>
                <AppIcon icon={Location01Icon} size={14} color={ACCENT} />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center gap-1.5">
                  <Text className="text-base font-semibold text-ink" numberOfLines={1}>
                    {primaryLabel || 'Move the map to set your pin'}
                  </Text>
                  {resolving ? <ActivityIndicator size="small" color={colors.ink} /> : null}
                </View>
                {secondaryLabel.length > 0 && (
                  <Text className="text-xs font-medium text-ink/50" numberOfLines={1}>
                    {secondaryLabel}
                  </Text>
                )}
              </View>
              <Pressable
                onPress={() => searchInputRef.current?.focus()}
                hitSlop={8}
                className="rounded-full border px-3 py-1.5"
                style={{ borderColor: ACCENT }}
              >
                <Text className="text-xs font-bold" style={{ color: ACCENT }}>Change</Text>
              </Pressable>
            </View>

            {distanceFromDevice !== null && distanceFromDevice > FAR_PIN_THRESHOLD_KM && (
              <Text className="text-xs font-semibold text-danger">
                Pin location is {distanceFromDevice.toFixed(1)} km away from your current location
              </Text>
            )}

            {confirmError && <Text accessibilityRole="alert" className="text-sm text-danger">{confirmError}</Text>}
            <Pressable
              onPress={handleConfirm}
              disabled={resolving || confirming}
              className="h-[52px] flex-row items-center justify-center gap-1.5 rounded-full"
              accessibilityRole="button"
              accessibilityLabel="Confirm location"
              style={{ backgroundColor: resolving || confirming ? '#A0B8F4' : ACCENT }}
            >
              {confirming ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text className="text-[15px] font-medium text-white">Confirm location</Text>
                  <AppIcon icon={ArrowRight01Icon} size={16} color="#FFFFFF" strokeWidth={2.2} />
                </>
              )}
            </Pressable>
          </View>
        </View>
      </View>
      </KeyboardAvoidingView>
    </DismissKeyboardView>
  );
}

const styles = StyleSheet.create({
  userDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: ACCENT,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
});


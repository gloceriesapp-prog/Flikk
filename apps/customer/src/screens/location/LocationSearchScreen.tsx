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

import { ArrowLeft01Icon, GpsSignal01Icon, Location01Icon, Search01Icon } from '@hugeicons/core-free-icons';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import MapView, { PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/AppIcon';
import { AppImage as Image } from '../../components/AppImage';
import { DismissKeyboardView } from '../../components/DismissKeyboardView';
import {
  distanceKm,
  geocodeAddress,
  getCurrentCoordinates,
  requestLocationPermission,
  reverseGeocode,
  searchPlaces,
  type Coordinates,
} from '../../location/geocoding';
import { GRAYSCALE_MAP_STYLE } from '../../location/mapStyle';
import { useLocationStore } from '../../store/useLocationStore';
import { colors } from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'LocationSearch'>;

const BUTTON_ACCENT = '#1447e6';

// Meters below 1km (matches how Google/Zepto-style pickers phrase short
// distances — "324 m" reads immediately, "0.3 km" needs a second to parse),
// one decimal km above that.
function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

// ~130m span (tighter than the previous 0.004/~350m), per an explicit
// "zoom in more" ask — used for animateToRegion calls after a search/
// current-location fix, once the map's already showing (the INITIAL
// zoom level is set via initialCamera's own `zoom` below instead, since
// a Camera and a Region express zoom differently).
const DELTA = 0.0015;
// Straight-down (pitch 0), not tilted — an earlier pass tried a 45°
// pitch to get Google's real 3D building EXTRUSION, but that's exactly
// the wrong approach for a pin-precision screen: true 3D extrusion is
// inherently zoom-dependent (the tilted camera's own viewing angle
// changes as you zoom in, and extruded buildings can clip/vanish at
// close range — confirmed, that's exactly the bug this fixes), which is
// also why Blinkit/Instamart/Zepto don't tilt their own confirm-pin map
// either. Their "box" look — and this app's own, via mapStyle.ts's
// landscape.man_made fill/stroke — is just flat 2D building footprints
// with a distinct fill color, viewed straight-down. A plain filled
// polygon never disappears at any zoom, because there's no 3D geometry
// to clip in the first place. zoom (Android/Google) and altitude
// (iOS/Apple) both describe "how close" in each SDK's own units — Camera
// accepts both at once, each platform just reads the one it understands.
const INITIAL_PITCH = 0;
const INITIAL_ZOOM = 18.5;
const INITIAL_ALTITUDE = 300;
// Kaup/outer Udupi — this app's only launch zone (CLAUDE.md) — is the
// sensible default center when no real coords were handed in yet.
const DEFAULT_CENTER = { latitude: 13.2167, longitude: 74.7469 };

// Teardrop pin — replaces the old plain blue-dot-only marker, per an
// explicit ask/reference (same Google-Maps-pin-drop look). The source
// asset is a square canvas with the actual teardrop drawn inside it with
// transparent padding around it, not edge-to-edge — PIN_TIP_RATIO is
// where the tip sits within that square (eyeballed off the asset),
// needed because the true selected coordinate is the pin's TIP, not its
// visual center, so the image box has to be anchored by that point
// rather than centered the way a plain circle marker was.
const PIN_IMAGE_URI = 'https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/Images/gps.png';
const PIN_SIZE = 64;
const PIN_TIP_RATIO = 0.87;

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
  const [currentCoords, setCurrentCoords] = useState<Coordinates | null>(null);
  // react-native-maps' Android native view doesn't reliably resize when
  // its RN parent is a flex:1 box that's itself nested inside another
  // flex:1 box (exactly this screen's map-area/sheet split) — the map
  // stays sized to whatever it first measured (or collapses tiny) even
  // though the JS-side layout box is the right size, which is what left
  // a large blank gap between the map and the sheet with the pin/overlays
  // positioned correctly against the (correctly-sized) box but the map's
  // own tiles rendering into a much smaller area. Measuring the box and
  // handing MapView an explicit pixel height, not just flex:1, is the
  // standard workaround.
  const [mapAreaHeight, setMapAreaHeight] = useState(0);
  // Measured so the "current location" pill can sit just above the
  // floating card instead of a guessed fixed offset — the card's own
  // height varies (the distance-warning chip only sometimes renders).
  const [cardHeight, setCardHeight] = useState(0);
  // Gates showsUserLocation below — react-native-maps' native "my
  // location" blue dot only actually renders once the OS permission is
  // granted, and this screen can be reached two ways: via
  // LocationPermissionScreen (already asked) or straight from the
  // address book's "Change"/pin-edit flow (intent: 'address-book', never
  // asked). Requesting again when already granted is a harmless no-op —
  // this makes the dot work reliably regardless of which path got here.
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  // Live place-name suggestions as the user types — searchPlaces
  // (geocoding.ts, backend's Mappls autosuggest proxy) was already built
  // server-side but never actually wired into this screen's search bar,
  // which is why no dropdown ever showed no matter what you typed.
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const setLocation = useLocationStore((s) => s.setLocation);

  // Best-effort, once — purely to power the "Xkm away from your current
  // location" sanity-check line below, never blocks anything if it fails
  // (permission denied, GPS off, whatever) since the map itself doesn't
  // need this to function.
  useEffect(() => {
    requestLocationPermission()
      .then(setHasLocationPermission)
      .catch(() => setHasLocationPermission(false));
    getCurrentCoordinates()
      .then(setCurrentCoords)
      .catch(() => {});
  }, []);

  // Debounced (300ms) — firing a request on every keystroke would spam
  // the backend/Mappls for no benefit; a short pause after the user stops
  // typing is what every real autosuggest UI does. Cleared to an empty
  // list for a blank/whitespace-only query rather than showing stale
  // results from whatever was typed before it got cleared.
  useEffect(() => {
    const trimmed = query.trim();
    const timeout = setTimeout(() => {
      if (!trimmed) {
        setSuggestions([]);
        return;
      }
      searchPlaces(trimmed).then(setSuggestions);
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  const distanceFromCurrent = currentCoords ? distanceKm(currentCoords, center) : null;

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

  async function resolveAndGoTo(label: string) {
    setError(null);
    try {
      const coords = await geocodeAddress(label);
      if (!coords) {
        setError("Couldn't find that location. Try a different search.");
        return;
      }
      mapRef.current?.animateToRegion({ ...coords, latitudeDelta: DELTA, longitudeDelta: DELTA }, 400);
      // Typed/selected text stays the address label (that's what the
      // user actually searched for or picked) until the map settles and
      // reverse-geocodes the real pin position — onRegionChangeComplete
      // overwrites it right after.
      setAddressLabel(label);
    } catch {
      setError('Search failed. Please try again.');
    }
  }

  function handleSearch() {
    const trimmed = query.trim();
    if (!trimmed) return;
    setSuggestions([]);
    void resolveAndGoTo(trimmed);
  }

  function handleSelectSuggestion(label: string) {
    setQuery(label);
    setSuggestions([]);
    searchInputRef.current?.blur();
    void resolveAndGoTo(label);
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
        <StatusBar style="dark" />
        {/* Map area is its own flex:1 box now, not a full-screen layer the
            sheet floats on top of — per an explicit ask, the map must
            never render underneath the sheet at all. Every overlay below
            (scrims, pin, callout, header, search bar, error, current-
            location pill) is a child of THIS box, not the outer screen,
            so `top: '50%'`-style centering keeps resolving against the
            map's own actual visible area instead of the whole screen. */}
        <View className="flex-1" onLayout={(e) => setMapAreaHeight(e.nativeEvent.layout.height)}>
        <MapView
          ref={mapRef}
          style={mapAreaHeight > 0 ? { width: '100%', height: mapAreaHeight } : { flex: 1 }}
          // Android only — react-native-maps falls back to Apple Maps on
          // iOS regardless (no iOS Google Maps key configured, see
          // app.config.js's own note), and customMapStyle has no effect
          // there either way. This is a deliberate cross-platform split,
          // not a gap: Apple Maps needs no key/setup at all on iOS, and
          // react-native-maps' API (showsUserLocation, region events,
          // etc.) is identical either way — nothing else in this screen's
          // logic differs by platform.
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          customMapStyle={Platform.OS === 'android' ? GRAYSCALE_MAP_STYLE : undefined}
          // Reserves the floating card's own footprint so Google's
          // mandatory attribution logo (bottom-left, can't be hidden or
          // recolored — it's a fixed overlay the SDK draws itself, not
          // something a JSON style can touch) renders ABOVE the card
          // instead of getting cropped/covered behind it. mapPadding is
          // the correct react-native-maps API for this — it insets where
          // the SDK positions its own built-in UI (logo, compass), not
          // just a visual crop.
          mapPadding={{ top: 0, right: 0, bottom: cardHeight + insets.bottom + 16 + 16, left: 0 }}
          // initialCamera, not initialRegion — a Region has no pitch/zoom
          // concept at all, only a lat/lng delta "span", which is exactly
          // why the 3D buildings weren't showing regardless of how tight
          // that span was made.
          initialCamera={{ center, pitch: INITIAL_PITCH, heading: 0, zoom: INITIAL_ZOOM, altitude: INITIAL_ALTITUDE }}
          onRegionChangeComplete={handleRegionSettled}
          // The real "my location" blue dot — GPS-anchored to the actual
          // device position, native to the map (not a custom marker), so
          // it stays fixed on the real coordinate as the map pans
          // underneath it. Completely independent of the draggable
          // teardrop pin below, which follows the MAP's center (the
          // location being selected) — panning the map moves the pin,
          // never this dot; only actually walking around moves this dot.
          // showsMyLocationButton={false} because this screen already has
          // its own "Current location" pill (handleGoToCurrentLocation)
          // instead of the OS-default one.
          showsUserLocation={hasLocationPermission}
          showsMyLocationButton={false}
          // false, not the default true — Google's native 3D BUILDINGS
          // layer this prop controls is separate from mapStyle.ts's own
          // flat landscape.man_made footprint styling, has its own zoom-
          // dependent level-of-detail behavior we can't touch via JSON
          // style, and is exactly what was still disappearing at close
          // zoom even after the camera itself went flat (pitch: 0,
          // above) — that pitch change alone wasn't the real fix, this
          // native layer was still switching in underneath it. Turning
          // it off leaves ONLY the flat, JSON-styled footprint, which
          // never disappears at any zoom because it's a plain colored
          // polygon, not a 3D layer with its own LOD.
          showsBuildings={false}
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

        {/* Solid white header panel — per a later explicit ask/reference,
            replacing the earlier translucent map-shows-through wash (that
            was legible but read as unfinished/patchy). Square bottom edge,
            no shadow/card-like corner — a CSS-mask-style fade (solid white
            block, then a short gradient dissolving to transparent) blends
            it straight into the map instead of cutting a hard rounded line,
            which is what actually reads as premium rather than a floating
            card stacked on top of the map. */}
        <View pointerEvents="none" style={{ height: insets.top + 44 }} className="absolute left-0 right-0 top-0 bg-white" />
        <LinearGradient
          pointerEvents="none"
          colors={['#FFFFFF', 'rgba(255,255,255,0)']}
          style={{ position: 'absolute', left: 0, right: 0, top: insets.top + 44, height: 28 }}
        />

        {/* The pin itself, anchored by its TIP (not its center) to screen
            center — see this file's own header note on PIN_TIP_RATIO for
            why the box is shifted up by that fraction of its own height
            instead of the usual half-height a center-anchored image
            would use. */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: PIN_SIZE,
            height: PIN_SIZE,
            marginLeft: -PIN_SIZE / 2,
            marginTop: -PIN_SIZE * PIN_TIP_RATIO,
          }}
        >
          <Image source={{ uri: PIN_IMAGE_URI }} style={{ flex: 1 }} contentFit="contain" />
        </View>

        {/* Title is its own absolutely-centered layer (not a flex sibling
            of the back button) so it centers on the screen regardless of
            the back button's width — a flex-row would center it in the
            remaining space next to the button instead. */}
        {/* Back button and search bar are one flex row (not two independent
            absolutely-positioned Views each guessing the same top offset) —
            that's what guarantees they sit on the exact same line instead
            of relying on two separate `top` values happening to match. */}
        <View style={{ top: insets.top + 12 }} className="absolute left-4 right-4 h-11 flex-row items-center gap-2.5">
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={12}
            className="h-11 w-11 items-center justify-center rounded-full border border-gray-300 bg-white"
          >
            <AppIcon icon={ArrowLeft01Icon} size={20} color={colors.ink} />
          </Pressable>

          <View className="h-11 flex-1 flex-row items-center rounded-full border border-gray-300 bg-white px-4">
            <TextInput
              ref={searchInputRef}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              placeholder="Search an area or address"
              placeholderTextColor="#9AA5A3"
              textAlignVertical="center"
              className="h-full flex-1 py-0 text-base leading-tight text-ink"
            />
            <AppIcon icon={Search01Icon} size={18} color={colors.ink} />
          </View>
        </View>

        {/* The actual "place suggestion" dropdown — searchPlaces
            (geocoding.ts) hits the backend's already-built Mappls
            autosuggest proxy, debounced above; this is just the missing
            piece that renders what it returns. Text-only labels (that
            route's own note explains why Mappls's free tier gives no
            coordinates) — tapping one still resolves through the same
            on-device geocodeAddress every other search does. */}
        {suggestions.length > 0 ? (
          <View
            style={{ top: insets.top + 64 }}
            className="absolute left-4 right-4 overflow-hidden rounded-2xl bg-white shadow-sm shadow-black/10"
          >
            {suggestions.map((label, i) => (
              <Pressable
                key={label}
                onPress={() => handleSelectSuggestion(label)}
                className={`flex-row items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-mist' : ''}`}
              >
                <AppIcon icon={Search01Icon} size={15} color={`${colors.ink}80`} />
                <Text className="flex-1 text-[14px] text-ink" numberOfLines={1}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {error ? (
          <View style={{ top: insets.top + 64 }} className="absolute left-4 right-4 rounded-xl bg-danger/10 px-4 py-2">
            <Text className="text-[13px] text-danger">{error}</Text>
          </View>
        ) : null}

        {/* Centered horizontally now (left-0 right-0 + items-center on
            this wrapper), not right-4 — per an explicit reference. bottom-8
            is a fixed offset off the MAP AREA's own bottom edge, not
            sheetHeight-derived, since the sheet is no longer an overlay
            floating on top of the map (it's a normal-flow sibling below
            this whole box now), so there's nothing left to measure/avoid
            overlapping. White pill, blue icon+text directly (no separate
            icon badge) — matches the reference's plain "Use my current
            location" pill exactly. */}
        <View
          pointerEvents="box-none"
          style={{ bottom: cardHeight + insets.bottom + 16 + 16 }}
          className="absolute left-0 right-0 items-center"
        >
          <Pressable
            onPress={handleGoToCurrentLocation}
            className="flex-row items-center gap-2 rounded-full bg-white px-4 py-3 shadow-sm shadow-black/15"
          >
            <AppIcon icon={GpsSignal01Icon} size={18} color={BUTTON_ACCENT} />
            <Text className="text-sm font-bold" style={{ color: BUTTON_ACCENT }}>
              Use my current location
            </Text>
          </Pressable>
        </View>
        </View>

        {/* Floating card again — per a later explicit ask/reference (the
            Zepto-style card that floats over the map with visible margin
            and map peeking around all four edges), overriding the earlier
            full-bleed/normal-flow version this file used to have. All four
            corners rounded (not just the top), positioned absolute with
            real left/right/bottom margin instead of sitting flush against
            the screen edges. */}
        <View
          onLayout={(e) => setCardHeight(e.nativeEvent.layout.height)}
          className="absolute bottom-0 left-4 right-4 overflow-hidden rounded-3xl shadow-lg shadow-black/25"
          style={{ marginBottom: insets.bottom + 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' }}
        >
          {/* Real "liquid glass" — expo-blur's native BlurView (already a
              dependency, works on both platforms unlike iOS-only UIBlurEffect
              tricks) blurs the map showing through underneath, then a light
              translucent white wash on top keeps text legible without going
              fully opaque. A plain semi-transparent bg-white alone (no real
              blur) would just look like dirty glass, not frosted glass — the
              blur is what actually sells the effect. */}
          <BlurView intensity={45} tint="light" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.35)' }]} />

          {/* Header band is a slightly darker glass strip across the card's
              own top, not plain white — that's what gives the card its
              layered look in the reference instead of reading as one flat
              block. */}
          <View className="border-b border-white/40 px-5 py-3.5" style={{ backgroundColor: 'rgba(0,0,0,0.04)' }}>
            <Text className="text-[13.5px] font-semibold text-ink/60">Order will be delivered here</Text>
          </View>

          <View className="gap-4 px-5 pb-5 pt-4">
            <View className="flex-row items-center gap-3">
              {/* Filled pin in a soft blue circle — matches the reference's
                  colored pin instead of a plain black outline icon, and ties
                  visually back to this screen's own draggable map pin. */}
              <View className="h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: `${BUTTON_ACCENT}1A` }}>
                <AppIcon icon={Location01Icon} size={24} color={BUTTON_ACCENT} />
              </View>
              <View className="flex-1">
                {resolving ? (
                  <Text className="text-[15px] text-ink/50">Locating…</Text>
                ) : (
                  <>
                    <Text className="text-[16px] font-bold text-ink" numberOfLines={1}>
                      {addressLabel.split(',')[0] || 'Move the pin to your location'}
                    </Text>
                    <Text className="text-[13px] text-ink/45" numberOfLines={1}>
                      {addressLabel.split(',').slice(1).join(',').trim() || city}
                    </Text>
                  </>
                )}
              </View>
              <Pressable
                onPress={() => searchInputRef.current?.focus()}
                hitSlop={8}
                className="rounded-full border border-mist bg-white/70 px-3 py-1.5"
              >
                <Text className="text-[12.5px] font-bold" style={{ color: BUTTON_ACCENT }}>
                  Change
                </Text>
              </Pressable>
            </View>

            {distanceFromCurrent !== null ? (
              <View className="rounded-xl px-3.5 py-2.5" style={{ backgroundColor: `${colors.gold}26` }}>
                <Text className="text-[12.5px] font-medium" style={{ color: colors.gold }}>
                  This pin is {formatDistance(distanceFromCurrent)} from your current location
                </Text>
              </View>
            ) : null}

            <Pressable
              onPress={handleConfirm}
              disabled={resolving || confirming}
              className="flex-row items-center justify-center gap-2 rounded-2xl py-4"
              style={{ backgroundColor: resolving || confirming ? `${BUTTON_ACCENT}80` : BUTTON_ACCENT }}
            >
              {confirming ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-lg font-semibold text-white">Confirm Location</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </DismissKeyboardView>
  );
}

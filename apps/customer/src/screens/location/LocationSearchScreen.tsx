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

import { ArrowLeft01Icon, GpsSignal01Icon, Search01Icon } from '@hugeicons/core-free-icons';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { BlurView } from 'expo-blur';
import Constants from 'expo-constants';
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
  fetchNearbyPlaces,
  formatDistance,
  geocodeAddress,
  getCurrentCoordinates,
  requestLocationPermission,
  reverseGeocode,
  searchPlaces,
  type Coordinates,
  type NearbyPlace,
} from '../../location/geocoding';
import { GRAYSCALE_MAP_STYLE } from '../../location/mapStyle';
import { LocationRequestGate } from '../../location/requestGate';
import { useAuthStore } from '../../store/useAuthStore';
import { useLocationStore } from '../../store/useLocationStore';
import { useRecentSearchesStore } from '../../store/useRecentSearchesStore';
import { colors } from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';
import { storageUrl } from '../../utils/storageUrl';

type Props = NativeStackScreenProps<AppStackParamList, 'LocationSearch'>;

const BUTTON_ACCENT = '#1447e6';

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
// where the tip sits within that square, needed because the true
// selected coordinate is the pin's TIP, not its visual center, so the
// image box has to be anchored by that point rather than centered the
// way a plain circle marker was. Measured directly off the real 512x512
// PNG (lowest opaque pixel row / image height), not eyeballed — the
// previous 0.87 guess was off by ~3.5px at this PIN_SIZE, which is
// exactly the "pin isn't exactly on my location" the eyeball estimate
// caused. Re-measure this if the asset URL below is ever swapped for a
// visually different pin.
const PIN_IMAGE_URI = storageUrl('Images/gps.png');
const PIN_SIZE = 64;
const PIN_TIP_RATIO = 0.926;
// Small pin icon inside the confirm card's address row — a different asset
// from PIN_IMAGE_URI above (that one's the actual draggable map marker).
const CARD_PIN_ICON_URI = storageUrl('Images/map-pin.png');

// app.config.js's own note: true only once IOS_GOOGLE_MAPS_API_KEY is set
// AND a fresh native build has shipped (this is baked in at build time, not
// something that can flip at runtime without a rebuild). Read once at
// module scope, not per-render — it never changes for the life of the app.
const HAS_IOS_GOOGLE_MAPS = Constants.expoConfig?.extra?.hasIosGoogleMaps === true;
const USES_GOOGLE_MAPS = Platform.OS === 'android' || HAS_IOS_GOOGLE_MAPS;

export function LocationSearchScreen({ navigation, route }: Props) {
  const { intent, ...startingPoint } = route.params ?? {};
  const isAddressBookIntent = intent === 'address-book';

  // Guest (no accessToken) hitting the address-book flow specifically —
  // every one of its entry points (CartScreen's "Add address", the empty-
  // cart-address-sheet's "Add new", AddressListScreen, SelectLocationScreen)
  // funnels through here first, so this is the ONE place that needs the
  // guard rather than duplicating it at every call site. Left ungated for
  // every OTHER intent (plain delivery-location picking) — that's not
  // account-scoped, a guest browsing the app needs it to work same as
  // always. Same exitGuestMode() pattern ProfileScreen.tsx already
  // established: drops isGuest, RootNavigator swaps to AuthNavigator on
  // its own, no manual navigation.navigate('Login') call needed. Gating
  // HERE (before the map/search UI even renders) instead of letting a
  // guest fill in the whole pin-pick + address form only to have the
  // final POST /addresses 401 with a raw server error is the actual fix —
  // same class of bug as the earlier CartScreen/addresses-query one this
  // session, just caught before the user invests any time in the flow.
  const accessToken = useAuthStore((s) => s.accessToken);
  const exitGuestMode = useAuthStore((s) => s.exitGuestMode);
  useEffect(() => {
    if (isAddressBookIntent && !accessToken) exitGuestMode();
  }, [isAddressBookIntent, accessToken, exitGuestMode]);

  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const searchInputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState('');
  const [center, setCenter] = useState({
    latitude: startingPoint.latitude ?? DEFAULT_CENTER.latitude,
    longitude: startingPoint.longitude ?? DEFAULT_CENTER.longitude,
  });
  const [addressLabel, setAddressLabel] = useState(startingPoint.addressLabel ?? '');
  // Bold headline on the confirm card — real named-place components via
  // reverseGeocode's own shortName (geocoding.ts's note on why this isn't
  // addressLabel.split(',')[0] anymore). No shortName arrives through
  // navigation params (callers only ever have a plain label), so this
  // starts as a reasonable guess from whatever addressLabel came in and
  // gets replaced with the real thing the moment the map settles and
  // reverse-geocodes (handleRegionSettled below).
  const [shortName, setShortName] = useState(startingPoint.addressLabel?.split(',')[0]?.trim() ?? '');
  const [city, setCity] = useState(startingPoint.city ?? '');
  const [resolving, setResolving] = useState(!startingPoint.addressLabel);
  // Real nearby landmarks (fetchNearbyPlaces -> backend's Places Nearby
  // Search proxy) — chips under the confirm card, tap one to make it the
  // headline. Refetched every time the pin settles, same as shortName.
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
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
  // Real crash this guards against, not a defensive-programming guess:
  // react-native-maps on Android can throw a native NullPointerException
  // in MapView.applyBaseMapPadding when `mapPadding` is pushed to the
  // native view before its underlying GoogleMap object exists yet — that
  // object isn't ready until the SDK's own onMapReady fires, but this
  // component was passing a real mapPadding value from the very first
  // render (before ready). mapPadding stays undefined until onMapReady
  // sets this true; the pin/mapPadding math below is otherwise unchanged.
  const [mapReady, setMapReady] = useState(false);
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
  // The native "my location" blue dot's own live coordinate (from
  // onUserLocationChange below) — "Use my current location" used to call
  // getCurrentCoordinates() fresh instead, a SEPARATE one-off GPS fetch
  // that can genuinely differ from wherever the continuously-tracked blue
  // dot is actually drawn (a new fix, drift, or just a slightly later/
  // earlier sample), which is exactly why the pin could land visibly off
  // from the blue dot despite the blue dot itself being accurate. A ref,
  // not state — it updates many times a second and is only ever read once,
  // on tap, not rendered from.
  const liveUserLocation = useRef<Coordinates | null>(null);
  // Guards the one-time auto-recenter below — the pin should already be
  // exactly on the user's real position by default (per an explicit ask),
  // not just after they manually tap "Use my current location". Fires at
  // most once per screen visit, and only when the screen opened via a real
  // GPS fix in the first place (see the effect below) — never yanks the
  // map away from a location the user got to by searching or picking a
  // saved address.
  const hasAutoRecenteredRef = useRef(false);
  // Live place-name suggestions as the user types — searchPlaces
  // (geocoding.ts, backend's Mappls autosuggest proxy) was already built
  // server-side but never actually wired into this screen's search bar,
  // which is why no dropdown ever showed no matter what you typed.
  const pinRequests = useRef(new LocationRequestGate());
  const navigationRequests = useRef(new LocationRequestGate());
  const hasMovedPin = useRef(false);
  useEffect(() => () => { pinRequests.current.invalidate(); navigationRequests.current.invalidate(); }, []);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const setLocation = useLocationStore((s) => s.setLocation);
  const addRecentSearch = useRecentSearchesStore((s) => s.add);

  // Best-effort, once — powers the "Xkm away from your current location"
  // sanity-check line, and (per an explicit ask) also recenters the map on
  // the user's real GPS position when this screen opened with no real
  // starting point of its own (route.params.latitude/longitude unset —
  // e.g. reached via SelectLocationScreen's "Select it manually", not
  // LocationPermissionScreen or a saved-address tap, both of which already
  // hand in real coords). Falling back to the default zone center in that
  // case made the pin start somewhere the user has to notice and correct
  // before it means anything, instead of already being right. Never blocks
  // anything if it fails (permission denied, GPS off) — the map just stays
  // wherever it already was.
  useEffect(() => {
    // Chained, not parallel — getCurrentCoordinates (native
    // requestSingleLocation) used to fire in the same tick as
    // requestLocationPermission, racing the OS permission dialog's own
    // activity teardown/recreation on every mount of this screen (reached
    // from BOTH LocationPermissionScreen's buttons — this useEffect runs
    // regardless of which one was tapped). That race crashed natively
    // (expo.modules.location.LocationHelpers.requestSingleLocation ->
    // PromiseImpl.resolve NullPointerException), below the JS layer where
    // the .catch below could never have caught it. Only fetching a fix
    // once permission is confirmed granted — and requestLocationPermission
    // (geocoding.ts) itself now waits out the post-dialog settle window —
    // is what actually closes the race, not just papering over the crash.
    requestLocationPermission()
      .then((granted) => {
        setHasLocationPermission(granted);
        if (!granted) return;
        return getCurrentCoordinates().then((coords) => {
          setCurrentCoords(coords);
          if (startingPoint.latitude == null && !hasMovedPin.current) {
            setCenter(coords);
            mapRef.current?.animateToRegion({ ...coords, latitudeDelta: DELTA, longitudeDelta: DELTA }, 400);
          }
        });
      })
      .catch(() => setHasLocationPermission(false));
  }, [startingPoint.latitude]);

  // Debounced (300ms) — firing a request on every keystroke would spam
  // the backend/Mappls for no benefit; a short pause after the user stops
  // typing is what every real autosuggest UI does. Cleared to an empty
  // list for a blank/whitespace-only query rather than showing stale
  // results from whatever was typed before it got cleared.
  useEffect(() => {
    const trimmed = query.trim();
    let active = true;
    const timeout = setTimeout(() => {
      if (!trimmed) {
        setSuggestions([]);
        return;
      }
      searchPlaces(trimmed).then(rows => { if (active) setSuggestions(rows); });
    }, 300);
    return () => { active = false; clearTimeout(timeout); };
  }, [query]);

  const distanceFromCurrent = currentCoords ? distanceKm(currentCoords, center) : null;

  // Shared by mapPadding (below) and the pin's own vertical anchor — this
  // MUST be the same number in both places. mapPadding tells Google's
  // camera "the bottom `bottomPadding` px are obscured," so it centers
  // whatever coordinate we ask for within the REMAINING visible area
  // above that, not the full MapView box. The teardrop pin overlay used
  // to sit at a flat `top: '50%'` of the full box regardless — correct
  // only when mapPadding is zero, off by half of bottomPadding otherwise,
  // which is exactly the "pin isn't on my exact location" mismatch this
  // fixes: Google was centering the coordinate one place, our pin was
  // drawn somewhere else entirely.
  const bottomPadding = cardHeight + insets.bottom + 16 + 16;
  const pinAnchorTop = (mapAreaHeight - bottomPadding) / 2;

  async function handleRegionSettled(region: Region) {
    const next = { latitude: region.latitude, longitude: region.longitude };
    const ticket = pinRequests.current.begin();
    setCenter(next);
    setResolving(true);
    // Never combine a new coordinate with an old address label.
    setAddressLabel('Selected location'); setShortName('Selected location'); setCity('');
    void fetchNearbyPlaces(next).then(places => { if (pinRequests.current.current(ticket)) setNearbyPlaces(places); });
    try {
      const resolved = await reverseGeocode(next);
      if (!pinRequests.current.current(ticket)) return;
      setAddressLabel(resolved.addressLabel); setShortName(resolved.shortName); setCity(resolved.city);
    } catch {
      if (pinRequests.current.current(ticket)) setError('Couldn’t resolve this address. Confirm the pin and enter the address manually.');
    } finally {
      if (pinRequests.current.current(ticket)) setResolving(false);
    }
  }

  async function resolveAndGoTo(label: string) {
    const ticket = navigationRequests.current.begin();
    setError(null);
    try {
      const coords = await geocodeAddress(label);
      if (!navigationRequests.current.current(ticket)) return;
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
      setShortName(label.split(',')[0]?.trim() ?? label);
      addRecentSearch({ label, ...coords });
    } catch {
      if (navigationRequests.current.current(ticket)) setError('Search failed. Please try again.');
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
    const ticket = navigationRequests.current.begin();
    setError(null);
    try {
      // Prefer the blue dot's own live-tracked coordinate over a fresh
      // getCurrentCoordinates() fetch — see liveUserLocation's own note on
      // why those two can genuinely disagree. Falls back to a fresh fetch
      // only if the blue dot hasn't emitted a position yet (e.g. tapped
      // immediately on mount, before the first onUserLocationChange).
      const coords = liveUserLocation.current ?? (await getCurrentCoordinates());
      if (!navigationRequests.current.current(ticket)) return;
      mapRef.current?.animateToRegion({ ...coords, latitudeDelta: DELTA, longitudeDelta: DELTA }, 400);
    } catch {
      if (navigationRequests.current.current(ticket)) setError('Could not get your location. Please try searching instead.');
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

  // After every hook above (Rules of Hooks — an early return before them
  // would call a different number of hooks on the render that flips this
  // true, which React doesn't allow). See this file's own note next to
  // the accessToken/exitGuestMode declarations for why this check exists.
  if (isAddressBookIntent && !accessToken) return null;

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
          // USES_GOOGLE_MAPS is always true on Android; on iOS it flips to
          // true automatically once IOS_GOOGLE_MAPS_API_KEY is set and a
          // fresh native build ships (app.config.js's own note + this
          // file's own HAS_IOS_GOOGLE_MAPS constant above) — no further
          // edit needed here when that happens. Until then, iOS falls back
          // to Apple Maps: no JSON-styling API exists there at all (a real
          // platform ceiling, not a gap), so mapType="mutedStandard" below
          // is the closest free approximation.
          provider={USES_GOOGLE_MAPS ? PROVIDER_GOOGLE : undefined}
          customMapStyle={USES_GOOGLE_MAPS ? GRAYSCALE_MAP_STYLE : undefined}
          mapType={USES_GOOGLE_MAPS ? 'standard' : 'mutedStandard'}
          // Reserves the floating card's own footprint so Google's
          // mandatory attribution logo (bottom-left, can't be hidden or
          // recolored — it's a fixed overlay the SDK draws itself, not
          // something a JSON style can touch) renders ABOVE the card
          // instead of getting cropped/covered behind it. mapPadding is
          // the correct react-native-maps API for this — it insets where
          // the SDK positions its own built-in UI (logo, compass), not
          // just a visual crop.
          mapPadding={mapReady ? { top: 0, right: 0, bottom: bottomPadding, left: 0 } : undefined}
          onMapReady={() => setMapReady(true)}
          // initialCamera, not initialRegion — a Region has no pitch/zoom
          // concept at all, only a lat/lng delta "span", which is exactly
          // why the 3D buildings weren't showing regardless of how tight
          // that span was made.
          initialCamera={{ center, pitch: INITIAL_PITCH, heading: 0, zoom: INITIAL_ZOOM, altitude: INITIAL_ALTITUDE }}
          // Caps how far out this screen can zoom — per an explicit ask,
          // and it also sidesteps Google's own default blue "world view"
          // ocean/base color that only appears once you zoom out past
          // roughly city level, which this file's own mapStyle.ts doesn't
          // (and shouldn't need to) style. 14 still shows several
          // surrounding blocks, which is plenty for a pin-precision
          // confirm screen — nobody needs to zoom out to city-scale here.
          minZoomLevel={14}
          onPanDrag={() => { hasMovedPin.current = true; navigationRequests.current.invalidate(); }}
          onRegionChange={() => { pinRequests.current.invalidate(); setResolving(true); }}
          onRegionChangeComplete={handleRegionSettled}
          // Keeps liveUserLocation (handleGoToCurrentLocation's own note)
          // in sync with wherever the native blue dot actually is,
          // continuously — not just once on mount.
          onUserLocationChange={(e) => {
            const coordinate = e.nativeEvent.coordinate;
            if (!coordinate) return;
            const live = { latitude: coordinate.latitude, longitude: coordinate.longitude };
            liveUserLocation.current = live;
            // One-time auto-recenter onto the blue dot's own live fix —
            // only when this screen opened via a real GPS-based flow
            // (startingPoint.latitude set, e.g. LocationPermissionScreen)
            // and only once, the first time the blue dot reports in. Same
            // coordinate source handleGoToCurrentLocation already prefers
            // (this file's own liveUserLocation note above on why it's
            // more reliable than the one-off fetch startingPoint came
            // from), just applied automatically instead of waiting for a
            // manual tap.
            if (!hasAutoRecenteredRef.current && startingPoint.latitude != null) {
              hasAutoRecenteredRef.current = true;
              mapRef.current?.animateToRegion({ ...live, latitudeDelta: DELTA, longitudeDelta: DELTA }, 400);
            }
          }}
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
          // Back on (was false) — per an explicit ask/reference (Blinkit/
          // Flipkart's own pin-confirm map shows real shaded building
          // depth, which only Google's native buildings layer can draw;
          // mapStyle.ts's own note explains why a flat JSON fill/stroke
          // can't reproduce it). This was disabled earlier because it
          // still disappeared at close zoom even at pitch: 0 — if that
          // recurs, it's this prop, not mapStyle.ts, to revisit.
          showsBuildings
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

        {/* The pin itself, anchored by its TIP (not its center) to the
            map's own visually-centered point — see this file's own
            bottomPadding/pinAnchorTop note above for why that's
            `pinAnchorTop`, not a flat `top: '50%'` (only correct when
            mapPadding is zero). marginTop shifts the box up by
            PIN_TIP_RATIO's own fraction of its height on top of that,
            same reasoning as before. */}
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

        {/* Title is its own absolutely-centered layer (not a flex sibling
            of the back button) so it centers on the screen regardless of
            the back button's width — a flex-row would center it in the
            remaining space next to the button instead. */}
        {/* Back button and search bar are one flex row (not two independent
            absolutely-positioned Views each guessing the same top offset) —
            that's what guarantees they sit on the exact same line instead
            of relying on two separate `top` values happening to match. */}
        <View style={{ top: insets.top + 12 }} className="absolute left-4 right-4 h-11 flex-row items-center gap-2.5">
          <Pressable accessibilityRole="button" accessibilityLabel="Go back"
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
            className="flex-row items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm shadow-black/15"
          >
            <AppIcon icon={GpsSignal01Icon} size={18} color={BUTTON_ACCENT} />
            <Text className="text-sm font-semibold" style={{ color: BUTTON_ACCENT }}>
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
            {/* One single white card now, not two separate rounded boxes
                stacked with a gap — the address row and the distance line
                are one visual unit, not two unrelated pieces of info. */}
            <View className="rounded-2xl bg-white p-3">
              <View className="flex-row items-center gap-3">
                {/* Real pin image, not the outline AppIcon — ties visually
                    back to this screen's own draggable map pin. */}
                <View className="h-11 w-11 items-center justify-center rounded-full">
                  <Image source={{ uri: CARD_PIN_ICON_URI }} style={{ width: 28, height: 28 }} resizeMode="contain" />
                </View>
                <View className="flex-1">
                  {/* Text stays mounted through a resolve — previously this
                      swapped the whole block out for a plain "Locating…"
                      Text while resolving was true, which fired on every
                      single drag-settle and is exactly the visible
                      title/subtitle "blink" this was asked to fix. The
                      previous settle's real text now stays on screen
                      un-swapped while the next one resolves; the small
                      spinner below is the only thing that comes and goes. */}
                  <View className="flex-row items-center gap-1.5">
                    <Text className="text-[16px] font-bold text-ink" numberOfLines={1}>
                      {shortName || 'Move the pin to your location'}
                    </Text>
                    {resolving ? <ActivityIndicator size="small" color={colors.ink} /> : null}
                  </View>
                  {/* Full address below — geocoding.ts's own
                      reverseGeocode result, not a slice of it (shortName
                      above already carries the headline; this line
                      shows the complete real address, same as Blinkit/
                      Instamart's own confirm card). Only rendered when
                      there's real content — Google's reverse-geocode
                      sometimes returns just a single short place name
                      with no more to add (sparse rural data, this
                      file's own note on Plus-Code fallbacks elsewhere),
                      and an empty subtitle line still took up its own
                      row, reading as "the address is broken" rather
                      than "there's just nothing more to show". */}
                  {(addressLabel && addressLabel !== shortName) || city ? (
                    <Text className="text-[13px] text-ink/45" numberOfLines={2}>
                      {addressLabel && addressLabel !== shortName ? addressLabel : city}
                    </Text>
                  ) : null}
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
                <Text className="mt-2.5 text-[12.5px] font-medium text-red-600">
                  This pin is {formatDistance(distanceFromCurrent)} from your current location
                </Text>
              ) : null}
            </View>

            {/* Real nearby landmarks (fetchNearbyPlaces) — a customer who
                knows their area by landmark, not street name, taps one to
                make it the confirm card's own headline instead of the
                plain reverse-geocoded address above.
                Fixed-height wrapper, ALWAYS mounted (not conditionally
                rendered on nearbyPlaces.length) — this whole floating
                panel's height is measured once via onLayout below
                (cardHeight) and feeds straight into the MapView's
                mapPadding/pin-anchor math above. Mounting/unmounting this
                row on every settle changed that measured height each
                time, which re-triggered mapPadding and visibly shoved the
                pin up/down on every drag — a fixed height here means the
                panel's total height never changes, chips or not. FlatList
                over a plain ScrollView for the same reason any horizontal
                chip list should use one — cheaper re-renders as the data
                array actually changes underneath it. */}
            <View style={{ height: 40 }} className="justify-center">
              {nearbyPlaces.length > 0 ? (
                <FlatList
                  horizontal
                  data={nearbyPlaces}
                  keyExtractor={(place) => place.name}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8 }}
                  renderItem={({ item: place }) => (
                    <Pressable
                      onPress={() => setShortName(place.name)}
                      className="rounded-full border border-mist bg-white/80 px-3.5 py-2"
                    >
                      <Text className="text-[12.5px] font-semibold text-ink/70" numberOfLines={1}>
                        Near {place.name}
                      </Text>
                    </Pressable>
                  )}
                />
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
                <Text className="text-lg font-semibold text-white">Confirm Location</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </DismissKeyboardView>
  );
}

// Live map for the final leg — a rider marker that actually moves with
// the device's real GPS (watchRiderLocation, ticks every ~3s/10m) plus a
// fixed customer pin. This is a deliberate scope change past CLAUDE.md's
// original MVP line ("no live GPS delivery tracking") — the rider's own
// position is real; there's no live customer-side location to show, only
// their fixed address, since nothing in this build has the customer's
// device broadcasting anything.
//
// The line between the two pins is the shared saved road route for this leg
// (GET /rider/orders/:id/route): the very same line the customer sees on
// their track screen. The server works each leg out once; this map asks for
// it on the first GPS fix and then checks every ROUTE_CHECK_MS for a new
// version (the server re-routes a rider who left the road, for both apps).
// Neither the check nor reopening the map costs a Google call. The part of
// the road already ridden is hidden, so the line starts at the rider. Until
// the route lands (or if routing is unavailable) the map draws a straight
// dashed connector. Real turn-by-turn still hands OFF to the rider's maps
// app (openNavigation); this in-app line is "am I on track / how far".
//
// Camera behaviour is Uber-driver-app "nav mode", not a static both-pins
// overview: once a fix lands, the camera follows the rider tightly zoomed
// and tilted, rotating to match direction of travel (position.coords
// .heading) — animateCamera on every update, not a repeated
// fitToCoordinates. Framing both the rider and a possibly-distant customer
// pin on every single GPS tick is *why* the old version could zoom out to
// a whole-continent view mid-delivery — a rider needs to see the road
// they're on, not a bounding box.
//
// Needs a native dev build to render at all — react-native-maps isn't
// bundled in plain Expo Go as of SDK 52+ (app.config.js's own note, same
// gotcha apps/customer's LocationSearchScreen already documents).

import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';
import Constants from 'expo-constants';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Location01Icon, Navigation03Icon, Store01Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import { GRAYSCALE_MAP_STYLE } from '../../../location/mapStyle';
import { watchRiderLocation, type Coordinates } from '../../../location/riderLocation';
import { fetchOrderRoute } from '../../../api/directions';
import { roadAhead } from './roadAhead';

const DELTA = 0.01;
// Tight nav-mode zoom once the rider's own position is known — Google Maps
// zoom-level units, ~17 is "see your own street," the same level Uber's
// driver app sits at while navigating.
const FOLLOW_ZOOM = 17;

// Same provider-selection logic apps/customer's LocationSearchScreen uses:
// Android always gets Google Maps; iOS only once IOS_GOOGLE_MAPS_API_KEY is
// set AND a fresh native build ships (app.config.js bakes this boolean into
// extra at build time). Read once at module scope — it never changes for the
// life of the app. When false (iOS, no key) the map falls back to Apple Maps,
// which ignores customMapStyle, so mapType 'mutedStandard' is the closest
// free approximation of the grayscale look.
const HAS_IOS_GOOGLE_MAPS = Constants.expoConfig?.extra?.hasIosGoogleMaps === true;
const USES_GOOGLE_MAPS = Platform.OS === 'android' || HAS_IOS_GOOGLE_MAPS;

// How often the map checks the shared route for a re-route (no Google cost).
const ROUTE_CHECK_MS = 20_000;

interface Props {
  // The order this map belongs to: the server keeps one shared route per
  // order and leg (pickup for a store destination, drop for the customer).
  orderId: string;
  // The fixed point the rider is heading to — a store (pickup leg) or the
  // customer (drop leg). destinationKind only changes the pin's look/tint,
  // not the follow-camera behaviour.
  destination: Coordinates;
  destinationKind?: 'store' | 'customer';
  // Card view (default): h-64 rounded corners, embedded in a scroll list.
  // Full-screen: absolute-fills its parent, edge to edge — the Uber-style
  // "map is the screen" layout, with the rest of the screen's UI floating
  // on top of it.
  fullScreen?: boolean;
  // Fired on every real GPS fix so a parent can show live distance/ETA to
  // the destination without opening a second location watcher.
  onRiderMove?: (coords: Coordinates) => void;
  // Fired once when the road route lands, with Google's real driving ETA —
  // lets a parent show a true "12 min away" instead of a flat-speed guess.
  // null values mean routing was unavailable (parent keeps its own estimate).
  onRouteInfo?: (info: { durationMin: number | null; distanceKm: number | null }) => void;
}

export function DeliveryMapView({ orderId, destination, destinationKind = 'customer', fullScreen, onRiderMove, onRouteInfo }: Props) {
  const mapRef = useRef<MapView>(null);
  const [riderCoords, setRiderCoords] = useState<Coordinates | null>(null);
  const [routeCoords, setRouteCoords] = useState<Coordinates[] | null>(null);
  const routeVersion = useRef<number | null>(null);
  const hasFix = riderCoords !== null;
  const [permissionDenied, setPermissionDenied] = useState(false);
  const isStore = destinationKind === 'store';

  useEffect(() => {
    let subscription: { remove: () => void } | null = null;
    let cancelled = false;

    watchRiderLocation((coords) => {
      if (cancelled) return;
      setRiderCoords(coords);
      onRiderMove?.(coords);
    }).then((sub) => {
      if (cancelled) {
        sub?.remove();
        return;
      }
      if (!sub) setPermissionDenied(true);
      subscription = sub;
    });

    return () => {
      cancelled = true;
      subscription?.remove();
    };
    // onRiderMove intentionally excluded — a parent passing an inline fn
    // must not tear down and re-open the GPS watcher on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Every fix (not just the first) smoothly re-centers + re-rotates the
  // camera on the rider, tilted for depth — nav-mode follow, not a static
  // overview. heading is null while stationary (GPS can't derive a course
  // of travel with no movement), so keep whatever heading the camera
  // already had rather than snapping back to north.
  useEffect(() => {
    if (!riderCoords || !mapRef.current) return;
    mapRef.current.animateCamera(
      {
        center: riderCoords,
        zoom: FOLLOW_ZOOM,
        pitch: 45,
        ...(riderCoords.heading != null ? { heading: riderCoords.heading } : {}),
      },
      { duration: 800 }
    );
  }, [riderCoords]);

  // Load the shared route once the first fix is in (the server uses the
  // rider's reported position to work it out), then check for re-routes.
  // Only a new version redraws; a failed check keeps the current line.
  useEffect(() => {
    if (!hasFix) return;
    let cancelled = false;
    const leg = isStore ? 'pickup' : 'drop';
    const load = () => fetchOrderRoute(orderId, leg)
      .then((route) => {
        if (cancelled || route.version === null || route.version === routeVersion.current) {
          if (!cancelled && route.version === null && routeVersion.current === null) onRouteInfo?.({ durationMin: null, distanceKm: null });
          return;
        }
        routeVersion.current = route.version;
        if (route.polyline.length >= 2) setRouteCoords(route.polyline);
        onRouteInfo?.({ durationMin: route.durationMin, distanceKm: route.distanceKm });
      })
      .catch(() => {
        if (!cancelled && routeVersion.current === null) onRouteInfo?.({ durationMin: null, distanceKm: null });
      });
    void load();
    const timer = setInterval(() => { void load(); }, ROUTE_CHECK_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
    // onRouteInfo intentionally excluded — an inline fn from the parent must
    // not restart the route checks on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasFix, orderId, isStore]);

  if (permissionDenied) {
    return (
      <View className={fullScreen ? 'absolute inset-0 items-center justify-center gap-1 bg-mist px-6' : 'h-64 items-center justify-center gap-1 rounded-2xl bg-mist px-6'}>
        <Text className="text-center text-[13px] font-semibold text-ink">Location permission needed</Text>
        <Text className="text-center text-[12px] text-ink/50">Enable location access to show your live position on the map.</Text>
      </View>
    );
  }

  return (
    <View className={fullScreen ? 'absolute inset-0 bg-mist' : 'h-64 overflow-hidden rounded-2xl bg-mist'}>
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        provider={USES_GOOGLE_MAPS ? PROVIDER_GOOGLE : undefined}
        customMapStyle={USES_GOOGLE_MAPS ? GRAYSCALE_MAP_STYLE : undefined}
        mapType={USES_GOOGLE_MAPS ? 'standard' : 'mutedStandard'}
        initialRegion={{ ...(riderCoords ?? destination), latitudeDelta: DELTA, longitudeDelta: DELTA }}
      >
        {riderCoords ? (
          <Polyline
            coordinates={routeCoords ? roadAhead(routeCoords, riderCoords) : [riderCoords, destination]}
            strokeColor={isStore ? colors.limeDeep : colors.coral}
            strokeWidth={3}
            lineDashPattern={routeCoords ? undefined : [8, 6]}
          />
        ) : null}

        <Marker coordinate={destination} anchor={{ x: 0.5, y: 0.5 }}>
          {isStore ? (
            <View className="h-8 w-8 items-center justify-center rounded-full border-[3px] border-white bg-lime-deep shadow-sm shadow-black/20">
              <AppIcon icon={Store01Icon} size={14} color="#FFFFFF" />
            </View>
          ) : (
            <View className="h-8 w-8 items-center justify-center rounded-full border-[3px] border-white bg-coral shadow-sm shadow-black/20">
              <AppIcon icon={Location01Icon} size={14} color="#FFFFFF" />
            </View>
          )}
        </Marker>

        {riderCoords ? (
          // Rotated via plain style transform, not the Marker `rotation`
          // prop — that prop is reliable for native `image` markers but
          // flaky for custom JS children across iOS/Android, a plain
          // transform on the child View isn't.
          <Marker coordinate={riderCoords} anchor={{ x: 0.5, y: 0.5 }}>
            <View
              style={{ transform: [{ rotate: `${riderCoords.heading ?? 0}deg` }] }}
              className="h-9 w-9 items-center justify-center rounded-full border-[3px] border-white bg-ink shadow-sm shadow-black/20"
            >
              <AppIcon icon={Navigation03Icon} size={16} color={colors.lime} />
            </View>
          </Marker>
        ) : null}
      </MapView>

      {fullScreen ? (
        // Muted, not blurred — a thin white wash over the map itself (not
        // the card) is what gives the "premium" look the map alone was
        // missing: full-saturation map colors under a white UI read as
        // loud/cheap, a slightly dimmed map reads calmer. Sits above the
        // map but below the modal/otp layers rendered by the screen using
        // this component.
        <View pointerEvents="none" className="absolute inset-0 bg-white/15" />
      ) : null}

      {!riderCoords ? (
        <View pointerEvents="none" className="absolute inset-0 items-center justify-center bg-mist/80">
          <ActivityIndicator color={colors.ink} />
          <Text className="mt-2 text-[12px] font-medium text-ink/50">Getting your location…</Text>
        </View>
      ) : null}
    </View>
  );
}

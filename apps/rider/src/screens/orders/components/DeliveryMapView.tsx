// Live map for the final leg — a rider marker that actually moves with
// the device's real GPS (watchRiderLocation, ticks every ~3s/10m) plus a
// fixed customer pin. This is a deliberate scope change past CLAUDE.md's
// original MVP line ("no live GPS delivery tracking") — the rider's own
// position is real; there's no live customer-side location to show, only
// their fixed address, since nothing in this build has the customer's
// device broadcasting anything.
//
// The line between the two pins follows the real road route (GET /rider/route
// → Google Directions, proxied server-side). It's fetched ONCE from the first
// GPS fix to the destination — not re-routed on every 3s tick, which would
// burn Directions quota for a line that barely changes. Until that response
// lands (and if routing is unavailable — no key, quota, offline) the map draws
// the straight great-circle connector between the two pins as a fallback, so
// the line is always present, just road-shaped once the route arrives. Real
// turn-by-turn still hands OFF to the rider's maps app (openNavigation); this
// in-app line is "am I roughly on track / how far," not voice nav.
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
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Location01Icon, Navigation03Icon, Store01Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import { GRAYSCALE_MAP_STYLE } from '../../../location/mapStyle';
import { watchRiderLocation, type Coordinates } from '../../../location/riderLocation';
import { fetchRoute } from '../../../api/directions';

const DELTA = 0.01;
// Tight nav-mode zoom once the rider's own position is known — Google Maps
// zoom-level units, ~17 is "see your own street," the same level Uber's
// driver app sits at while navigating.
const FOLLOW_ZOOM = 17;

interface Props {
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

export function DeliveryMapView({ destination, destinationKind = 'customer', fullScreen, onRiderMove, onRouteInfo }: Props) {
  const mapRef = useRef<MapView>(null);
  const [riderCoords, setRiderCoords] = useState<Coordinates | null>(null);
  const [routeCoords, setRouteCoords] = useState<Coordinates[] | null>(null);
  const routeFetchedRef = useRef(false);
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

  // Fetch the road route ONCE, from the first fix to the destination. Guarded
  // by a ref so the 3s GPS ticks don't re-hit Directions. On any failure the
  // straight fallback line below just stays — routeCoords stays null — and
  // onRouteInfo fires with nulls so the parent keeps its own flat-speed ETA.
  useEffect(() => {
    if (!riderCoords || routeFetchedRef.current) return;
    routeFetchedRef.current = true;
    let cancelled = false;
    fetchRoute(riderCoords, destination)
      .then((route) => {
        if (cancelled) return;
        if (route.polyline.length > 0) setRouteCoords(route.polyline);
        onRouteInfo?.({ durationMin: route.durationMin, distanceKm: route.distanceKm });
      })
      .catch(() => {
        if (!cancelled) onRouteInfo?.({ durationMin: null, distanceKm: null });
      });
    return () => {
      cancelled = true;
    };
    // onRouteInfo intentionally excluded — an inline fn from the parent must
    // not re-trigger the one-shot route fetch on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [riderCoords, destination]);

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
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        customMapStyle={Platform.OS === 'android' ? GRAYSCALE_MAP_STYLE : undefined}
        initialRegion={{ ...(riderCoords ?? destination), latitudeDelta: DELTA, longitudeDelta: DELTA }}
      >
        {riderCoords ? (
          <Polyline
            coordinates={routeCoords ?? [riderCoords, destination]}
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

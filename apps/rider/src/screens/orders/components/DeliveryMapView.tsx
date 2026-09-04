// Live map for the final leg — a rider marker that actually moves with
// the device's real GPS (watchRiderLocation, ticks every ~3s/10m) plus a
// fixed customer pin. This is a deliberate scope change past CLAUDE.md's
// original MVP line ("no live GPS delivery tracking") — the rider's own
// position is real; there's no live customer-side location to show, only
// their fixed address, since nothing in this build has the customer's
// device broadcasting anything.
//
// The line between the two pins is a straight great-circle connector
// (Polyline drawn directly between riderCoords/customerCoords), not a
// real road-following route — an actual routed line needs a Directions
// API call (Google Directions / Apple MapKit directions), which is real
// added cost and complexity, not a UI change. Deliberately skipped for
// now — this straight line gets most of the "Google Maps look" for free.
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
import { Location01Icon, Navigation03Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import { GRAYSCALE_MAP_STYLE } from '../../../location/mapStyle';
import { watchRiderLocation, type Coordinates } from '../../../location/riderLocation';

const DELTA = 0.01;
// Tight nav-mode zoom once the rider's own position is known — Google Maps
// zoom-level units, ~17 is "see your own street," the same level Uber's
// driver app sits at while navigating.
const FOLLOW_ZOOM = 17;

interface Props {
  customerCoords: Coordinates;
  // Card view (default): h-64 rounded corners, embedded in a scroll list.
  // Full-screen: absolute-fills its parent, edge to edge — the Uber-style
  // "map is the screen" layout, with the rest of OrderDetailScreen's
  // arrived_at_customer UI floating on top of it.
  fullScreen?: boolean;
}

export function DeliveryMapView({ customerCoords, fullScreen }: Props) {
  const mapRef = useRef<MapView>(null);
  const [riderCoords, setRiderCoords] = useState<Coordinates | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    let subscription: { remove: () => void } | null = null;
    let cancelled = false;

    watchRiderLocation((coords) => {
      if (cancelled) return;
      setRiderCoords(coords);
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
        initialRegion={{ ...(riderCoords ?? customerCoords), latitudeDelta: DELTA, longitudeDelta: DELTA }}
      >
        {riderCoords ? (
          <Polyline
            coordinates={[riderCoords, customerCoords]}
            strokeColor={colors.coral}
            strokeWidth={3}
            lineDashPattern={[8, 6]}
          />
        ) : null}

        <Marker coordinate={customerCoords} anchor={{ x: 0.5, y: 0.5 }}>
          <View className="h-8 w-8 items-center justify-center rounded-full border-[3px] border-white bg-coral shadow-sm shadow-black/20">
            <AppIcon icon={Location01Icon} size={14} color="#FFFFFF" />
          </View>
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

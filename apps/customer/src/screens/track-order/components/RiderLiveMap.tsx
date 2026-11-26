// Show the pickup and delivery pins while the order is being prepared.
// Once the rider has picked up, the map is rider -> customer: the scooter,
// the delivery pin and a line between them. On a Google map that line is
// the road ahead (re-requested from the rider when they leave it); otherwise,
// or until a road route arrives, it is a dashed connector.
//
// Map conventions follow LocationSearchScreen: Google provider + grayscale
// style on Android (and iOS builds with the native Google SDK), Apple Maps muted
// otherwise. react-native-maps isn't in Expo Go and a native map failure
// shouldn't take down the tracker, so both fall back to the caption alone.
import { Component, useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useReducedMotion } from 'react-native-reanimated';
import { IconlyStore } from '../../../components/icons/iconly';
import { HomeOutlineIcon } from '../../../components/icons/HomeOutlineIcon';
import { GRAYSCALE_MAP_STYLE } from '../../../location/mapStyle';
import { usesGoogleMaps } from '../../../location/mapProvider';
import { colors } from '../../../theme/tokens';
import type { DeliveryRoutePoint, MapCoordinates, RiderLocationResponse } from '../../../api/tracking';
import { riderMapView } from '../state/riderLocationView';
import { GlidingRider } from './GlidingRider';
import { mapDistanceMeters, matchRoute, remainingRoad, riderHeading, roadBetween, type RouteProgress } from '../state/routeProgress';

const USES_GOOGLE_MAPS = usesGoogleMaps();
const MAPS_AVAILABLE = Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
const MAP_HEIGHT = 264;
const PICKUP_PADDING = { top: 68, right: 66, bottom: 72, left: 66 };
const DELIVERY_PADDING = { top: 54, right: 50, bottom: 58, left: 50 };
const TRACKING_MAP_STYLE = [
  ...GRAYSCALE_MAP_STYLE,
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
];
const AGE_TICK_MS = 5_000;
const CAMERA_ADVANCE_METERS = 25;
const ENDPOINT_COLOR = '#35383A';
// Pin: icon circle, a short stem, and a dot that sits exactly on the
// location (the marker anchor). The store pin adds its name under the dot;
// the delivery address is just the house.
const PIN_CIRCLE = 30;
const PIN_STEM = 8;
const PIN_DOT = 9;
const PIN_ANCHOR_Y = PIN_CIRCLE + PIN_STEM + PIN_DOT / 2;
const PIN_LABEL_HEIGHT = 20;

function DeliveryEndpoint({ coordinate, isPickup = false }: { coordinate: MapCoordinates; isPickup?: boolean }) {
  const height = PIN_CIRCLE + PIN_STEM + PIN_DOT + (isPickup ? PIN_LABEL_HEIGHT : 0);
  return (
    <Marker
      coordinate={toLatLng(coordinate)}
      anchor={{ x: 0.5, y: PIN_ANCHOR_Y / height }}
      centerOffset={{ x: 0, y: height / 2 - PIN_ANCHOR_Y }}
      title={isPickup ? 'Gloceries' : 'Delivery address'}
      zIndex={1}
    >
      <View collapsable={false} style={[styles.endpoint, { height }]}>
        <View style={styles.endpointBody}>
          {isPickup ? <IconlyStore size={15} color="#FFFFFF" /> : <HomeOutlineIcon size={15} color="#FFFFFF" />}
        </View>
        <View style={styles.endpointStem} />
        <View style={styles.endpointDot} />
        {isPickup ? <Text numberOfLines={1} style={styles.endpointLabel}>Gloceries</Text> : null}
      </View>
    </Marker>
  );
}

const toLatLng = (c: MapCoordinates) => ({ latitude: c.lat, longitude: c.lng });

// Draw the dashed link locally. Native Google Maps providers differ in
// how they size dashes, so use short segments for a consistent appearance.
function dashedConnector(from: DeliveryRoutePoint, to: DeliveryRoutePoint): DeliveryRoutePoint[][] {
  const latitudeDelta = to.latitude - from.latitude;
  const longitudeDelta = to.longitude - from.longitude;
  if (!latitudeDelta && !longitudeDelta) return [];

  function point(progress: number) {
    const curve = 0.48 * progress * (1 - progress);
    return {
      latitude: from.latitude + latitudeDelta * progress + longitudeDelta * curve,
      longitude: from.longitude + longitudeDelta * progress - latitudeDelta * curve,
    };
  }

  const dashCount = 12;
  return Array.from({ length: dashCount }, (_, index) => [
    point((index + 0.18) / dashCount),
    point((index + 0.72) / dashCount),
  ]);
}

class MapBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}

interface Props {
  outForDelivery: boolean;
  response: RiderLocationResponse | undefined;
  fetchedAt: number;
  route?: DeliveryRoutePoint[] | null;
  // Called while a fresh rider fix is off the road route (rate-limited by caller).
  onOffRoute?: () => void;
}

export function RiderLiveMap({ outForDelivery, response, fetchedAt, route, onOffRoute }: Props) {
  const [now, setNow] = useState(() => Date.now());
  const [mapFailed, setMapFailed] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  // Which leg the rider is on: heading to the store, or to the customer.
  // Older servers send no leg; out for delivery then means the drop leg.
  const leg = response?.active ? (response.leg ?? (outForDelivery ? 'drop' : null)) : null;
  const towardStore = leg === 'pickup';
  const [pannedPhase, setPannedPhase] = useState<string | null>(null);
  const userMoved = pannedPhase === String(leg);
  const mapRef = useRef<MapView>(null);
  const lastFrame = useRef<{ key: string; focus: DeliveryRoutePoint | null } | null>(null);
  const [confirmed, setConfirmed] = useState<{
    route: DeliveryRoutePoint[];
    latitude: number;
    longitude: number;
    progress: RouteProgress | null;
    onRoute: boolean;
    // Road from the previous fix to this one, for the rider to glide along.
    glide: DeliveryRoutePoint[] | null;
  } | null>(null);
  const reduceMotion = useReducedMotion();

  // Keeps "updated Xs ago" honest between polls.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), AGE_TICK_MS);
    return () => clearInterval(timer);
  }, []);

  const view = riderMapView(response, fetchedAt, now);
  const { destination } = view;
  const rider = leg ? view.rider : null;
  const caption = leg ? view.caption : 'Pickup and delivery locations';
  const riderLat = rider?.lat; const riderLng = rider?.lng;
  const destLat = destination?.lat; const destLng = destination?.lng;
  const pickup = response?.pickup;
  const pickupLat = pickup?.lat; const pickupLng = pickup?.lng;
  // The customer sees a route only once the order is out for delivery (drop
  // leg): before that, just the rider, store and home pins, no line.
  const roadRoute = leg === 'drop' && USES_GOOGLE_MAPS && route && route.length >= 2 ? route : null;

  const previousMatch = confirmed?.route === roadRoute ? confirmed : null;
  let progress = previousMatch?.progress ?? null;
  let onRoute = previousMatch?.onRoute ?? false;
  let glide = previousMatch?.glide ?? null;
  // Record each new fix once, retaining the previous progress if the rider
  // strays from the route or GPS jitters backwards.
  if (roadRoute && riderLat !== undefined && riderLng !== undefined
    && (previousMatch?.latitude !== riderLat || previousMatch.longitude !== riderLng)) {
    const match = matchRoute(roadRoute, { latitude: riderLat, longitude: riderLng }, progress ?? undefined);
    glide = match && progress && onRoute ? roadBetween(roadRoute, progress, match) : null;
    progress = match ?? progress;
    onRoute = match !== null;
    setConfirmed({ route: roadRoute, latitude: riderLat, longitude: riderLng, progress, onRoute, glide });
  }

  const riderPoint = rider ? toLatLng(rider) : null;
  const destinationPoint = destination ? toLatLng(destination) : null;
  const pickupPoint = pickup ? toLatLng(pickup) : null;
  // Where the rider is heading on this leg (which way the scooter faces).
  const targetPoint = towardStore ? pickupPoint : destinationPoint;
  const followsRoad = roadRoute !== null && (!riderPoint || onRoute);
  const roadAhead = followsRoad ? remainingRoad(roadRoute, progress) : null;
  // The solid line starts at the scooter itself, not the snapped road point.
  const solidLine = roadAhead && riderPoint ? [riderPoint, ...roadAhead] : roadAhead;
  // Blue dashes: out for delivery but off the saved road, straight to the
  // customer while the server re-routes.
  const riderDashes = leg === 'drop' && !followsRoad && riderPoint && destinationPoint ? dashedConnector(riderPoint, destinationPoint) : [];
  const heading = riderHeading(
    riderPoint && onRoute && roadAhead ? roadAhead
      : riderPoint && targetPoint ? [riderPoint, targetPoint] : null,
  );
  // A stopped rider keeps facing the way they were going.
  const [lastHeading, setLastHeading] = useState(0);
  if (heading !== null && heading !== lastHeading) setLastHeading(heading);
  const rotation = heading ?? lastHeading;

  // Keep the rider and the customer's pin in view together. Small GPS shifts
  // and manual map gestures leave the camera alone; a stale fix keeps the
  // last view until GPS returns.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || userMoved) return;

    const focus = riderLat !== undefined && riderLng !== undefined ? { latitude: riderLat, longitude: riderLng } : null;
    const key = [leg, roadRoute !== null, pickupLat, pickupLng, destLat, destLng].join(',');
    const previous = lastFrame.current;
    if (previous?.key === key
      && (!focus || (previous.focus && mapDistanceMeters(previous.focus, focus) < CAMERA_ADVANCE_METERS))) return;

    const points: DeliveryRoutePoint[] = [];
    if (focus) points.push(focus);
    if (destLat !== undefined && destLng !== undefined) points.push({ latitude: destLat, longitude: destLng });
    if (leg !== 'drop' && pickupLat !== undefined && pickupLng !== undefined) {
      points.push({ latitude: pickupLat, longitude: pickupLng });
    }
    if (leg && !focus && roadRoute) points.push(...remainingRoad(roadRoute, progress));
    const first = points[0];
    if (!first) return;

    lastFrame.current = { key, focus };
    const hasExtent = points.some(point => point.latitude !== first.latitude || point.longitude !== first.longitude);
    if (hasExtent) {
      map.fitToCoordinates(points, {
        edgePadding: leg === 'drop' ? DELIVERY_PADDING : PICKUP_PADDING,
        animated: !reduceMotion,
      });
    } else {
      const camera = { center: first, zoom: 16, altitude: 1800 };
      if (reduceMotion) map.setCamera(camera);
      else map.animateCamera(camera, { duration: 400 });
    }
  }, [destLat, destLng, leg, mapReady, pickupLat, pickupLng, progress, reduceMotion, riderLat, riderLng, roadRoute, userMoved]);

  function recenter() {
    lastFrame.current = null;
    setPannedPhase(null);
  }

  if (!response || (!response.active && !pickup && !destination)) return null;
  const anchor = rider ?? destination ?? pickup ?? null;
  const showMap = MAPS_AVAILABLE && !mapFailed && anchor !== null;

  return (
    <View className="w-full overflow-hidden rounded-3xl bg-white" accessible={!showMap} accessibilityLabel={caption}>
      {showMap ? (
        <View style={{ height: MAP_HEIGHT }}>
          <MapBoundary onError={() => setMapFailed(true)}>
            <MapView
              ref={mapRef}
              style={StyleSheet.absoluteFill}
              provider={USES_GOOGLE_MAPS ? PROVIDER_GOOGLE : undefined}
              customMapStyle={USES_GOOGLE_MAPS ? TRACKING_MAP_STYLE : undefined}
              mapType={USES_GOOGLE_MAPS ? 'standard' : 'mutedStandard'}
              initialRegion={{ ...toLatLng(anchor), latitudeDelta: 0.02, longitudeDelta: 0.02 }}
              onMapReady={() => {
                lastFrame.current = null;
                setMapReady(true);
              }}
              onRegionChangeStart={(_, details) => {
                if (details.isGesture) setPannedPhase(String(leg));
              }}
              onPanDrag={() => setPannedPhase(String(leg))}
              showsUserLocation={false}
              showsMyLocationButton={false}
              showsCompass={false}
              showsBuildings={false}
              showsPointsOfInterests={false}
              toolbarEnabled={false}
              rotateEnabled={false}
              pitchEnabled={false}
              accessibilityLabel={`Map. ${caption}`}
            >
              {riderDashes.map((coordinates, index) => (
                <Polyline key={`rider-${index}`} coordinates={coordinates} strokeWidth={3} strokeColor={colors.primary} />
              ))}
              {!riderPoint && solidLine && solidLine.length >= 2 ? (
                <Polyline coordinates={solidLine} strokeWidth={4} strokeColor={colors.primary} lineCap="round" />
              ) : null}
              {pickup && leg !== 'drop' ? <DeliveryEndpoint coordinate={pickup} isPickup /> : null}
              {destination ? <DeliveryEndpoint coordinate={destination} /> : null}
              {riderPoint ? (
                <GlidingRider latitude={riderPoint.latitude} longitude={riderPoint.longitude}
                  fixAt={Date.parse(response.rider_location?.updated_at ?? '') || fetchedAt} glide={onRoute ? glide : null} line={solidLine}
                  heading={rotation} reduceMotion={reduceMotion} />
              ) : null}
            </MapView>
          </MapBoundary>
          {userMoved ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Recenter map" onPress={recenter} hitSlop={8}
              className="absolute right-3 top-3 rounded-full bg-white px-3 py-1.5 shadow shadow-black/20">
              <Text className="text-[12.5px] font-semibold text-ink">Recenter</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {/* A fresh rider position needs no caption (the moving rider says it);
          a waiting or stale position, or no map, still explains itself. */}
      {(outForDelivery && !rider) || !showMap ? (
        <View className="flex-row items-center gap-2 px-5 py-3.5">
          <View style={[styles.dot, { backgroundColor: rider ? colors.success : '#9CA3AF' }]} />
          <Text className="flex-1 text-[13px] font-medium text-ink/70">{caption}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  endpoint: { width: 82, alignItems: 'center' },
  endpointBody: {
    width: PIN_CIRCLE, height: PIN_CIRCLE, borderRadius: PIN_CIRCLE / 2, backgroundColor: ENDPOINT_COLOR,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#FFFFFF',
  },
  endpointStem: { width: 2.5, height: PIN_STEM, backgroundColor: ENDPOINT_COLOR },
  endpointDot: {
    width: PIN_DOT, height: PIN_DOT, borderRadius: PIN_DOT / 2, backgroundColor: ENDPOINT_COLOR,
    borderWidth: 1.5, borderColor: '#FFFFFF',
  },
  endpointLabel: {
    marginTop: 4, paddingHorizontal: 7, borderRadius: 4, overflow: 'hidden',
    backgroundColor: '#FFFFFF', borderColor: '#DFE1E4', borderWidth: StyleSheet.hairlineWidth,
    color: '#454B55', fontSize: 11, fontWeight: '600', lineHeight: 17,
    textAlign: 'center', includeFontPadding: false,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
});

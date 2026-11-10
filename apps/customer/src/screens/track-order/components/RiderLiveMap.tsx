// Show the pickup and delivery pins while the order is being prepared.
// Once the rider has picked up, render the road route and a fresh rider fix.
//
// Map conventions follow LocationSearchScreen: Google provider + grayscale
// style on Android (and iOS builds with the native Google SDK), Apple Maps muted
// otherwise. react-native-maps isn't in Expo Go and a native map failure
// shouldn't take down the tracker, so both fall back to the caption alone.
import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useReducedMotion } from 'react-native-reanimated';
import { IconlySend, IconlyStore } from '../../../components/icons/iconly';
import { GRAYSCALE_MAP_STYLE } from '../../../location/mapStyle';
import { usesGoogleMaps } from '../../../location/mapProvider';
import { colors } from '../../../theme/tokens';
import type { DeliveryRoutePoint, MapCoordinates, RiderLocationResponse } from '../../../api/tracking';
import { riderMapView } from '../state/riderLocationView';
import { mapDistanceMeters, matchRoute, remainingRoad, scooterPose, type RouteProgress } from '../state/routeProgress';

const USES_GOOGLE_MAPS = usesGoogleMaps();
const MAPS_AVAILABLE = Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
const MAP_HEIGHT = 264;
const PICKUP_PADDING = { top: 68, right: 66, bottom: 72, left: 66 };
const DELIVERY_PADDING = { top: 54, right: 50, bottom: 58, left: 50 };
const TRACKING_MAP_STYLE = [
  ...GRAYSCALE_MAP_STYLE,
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
];
const SCOOTER_LEFT = require('../../../../assets/illustrations/tracking-scooter.png');
const SCOOTER_RIGHT = require('../../../../assets/illustrations/tracking-scooter-right.png');
const AGE_TICK_MS = 5_000;
const CAMERA_ADVANCE_METERS = 8;
const RIDER_FOLLOW_ZOOM = 18;
const ENDPOINT_COLOR = '#35383A';
const ENDPOINT_HEIGHT = 66;
const ENDPOINT_ANCHOR_Y = 43;

function DeliveryEndpoint({ coordinate, isPickup = false }: { coordinate: MapCoordinates; isPickup?: boolean }) {
  const label = isPickup ? 'Gloceries' : 'Deliver';
  const Icon = isPickup ? IconlyStore : IconlySend;
  return (
    <Marker
      coordinate={toLatLng(coordinate)}
      anchor={{ x: 0.5, y: ENDPOINT_ANCHOR_Y / ENDPOINT_HEIGHT }}
      centerOffset={{ x: 0, y: ENDPOINT_HEIGHT / 2 - ENDPOINT_ANCHOR_Y }}
      title={label}
      zIndex={1}
    >
      <View collapsable={false} style={styles.endpoint}>
        <View style={styles.endpointBody}><Icon size={19} color="#FFFFFF" /></View>
        <View style={styles.endpointTip} />
        <View style={styles.endpointDot} />
        <Text numberOfLines={1} style={styles.endpointLabel}>{label}</Text>
      </View>
    </Marker>
  );
}

const toLatLng = (c: MapCoordinates) => ({ latitude: c.lat, longitude: c.lng });

// Draw the pre-pickup link locally. Native Google Maps providers differ in
// how they size dashes, so use short segments for a consistent appearance.
function pickupConnector(from: DeliveryRoutePoint, to: DeliveryRoutePoint): DeliveryRoutePoint[][] {
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
}

export function RiderLiveMap({ outForDelivery, response, fetchedAt, route }: Props) {
  const [now, setNow] = useState(() => Date.now());
  const [mapFailed, setMapFailed] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [pannedPhase, setPannedPhase] = useState<boolean | null>(null);
  const userMoved = pannedPhase === outForDelivery;
  const mapRef = useRef<MapView>(null);
  const lastFrame = useRef<{
    points: DeliveryRoutePoint[];
    outForDelivery: boolean;
    focus: DeliveryRoutePoint | null;
  } | null>(null);
  const [confirmed, setConfirmed] = useState<{ route: DeliveryRoutePoint[]; progress: RouteProgress } | null>(null);
  const reduceMotion = useReducedMotion();

  // Keeps "updated Xs ago" honest between polls.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), AGE_TICK_MS);
    return () => clearInterval(timer);
  }, []);

  const view = riderMapView(response, fetchedAt, now);
  const { destination } = view;
  const rider = outForDelivery && response?.active ? view.rider : null;
  const caption = outForDelivery ? view.caption : 'Pickup and delivery locations';
  const riderLat = rider?.lat; const riderLng = rider?.lng;
  const destLat = destination?.lat; const destLng = destination?.lng;
  const pickup = response?.pickup;
  const pickupLat = pickup?.lat; const pickupLng = pickup?.lng;
  const roadRoute = outForDelivery && USES_GOOGLE_MAPS && route && route.length >= 2 ? route : null;


  const savedProgress = confirmed?.route === roadRoute ? confirmed.progress : undefined;
  const progress = useMemo(() => {
    if (!roadRoute || riderLat === undefined || riderLng === undefined) return savedProgress ?? null;
    const match = matchRoute(roadRoute, { latitude: riderLat, longitude: riderLng }, savedProgress);
    if (!match || (savedProgress?.segment === match.segment && savedProgress.fraction === match.fraction)) {
      return savedProgress ?? null;
    }
    return match;
  }, [roadRoute, riderLat, riderLng, savedProgress]);

  useEffect(() => {
    if (roadRoute && progress && progress !== savedProgress) {
      setConfirmed({ route: roadRoute, progress });
    }
  }, [roadRoute, progress, savedProgress]);
  const roadAhead = useMemo(() => roadRoute ? remainingRoad(roadRoute, progress) : null, [roadRoute, progress]);
  const { facesRight, rotation } = useMemo(() => scooterPose(progress ? roadAhead : null), [roadAhead, progress]);
  const dashes = useMemo(() => {
    if (outForDelivery || pickupLat === undefined || pickupLng === undefined
      || destLat === undefined || destLng === undefined) return [];
    return pickupConnector(
      { latitude: pickupLat, longitude: pickupLng },
      { latitude: destLat, longitude: destLng },
    );
  }, [outForDelivery, pickupLat, pickupLng, destLat, destLng]);
  const deliveryFrame = useMemo(() => {
    const points: DeliveryRoutePoint[] = [];
    if (pickupLat !== undefined && pickupLng !== undefined) {
      points.push({ latitude: pickupLat, longitude: pickupLng });
    }
    if (destLat !== undefined && destLng !== undefined) {
      points.push({ latitude: destLat, longitude: destLng });
    }
    return points;
  }, [pickupLat, pickupLng, destLat, destLng]);

  // With a road route and a fresh rider fix, keep a close view of the
  // scooter. Small GPS shifts and manual map gestures leave the camera alone.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || userMoved) return;

    const basis = roadRoute ?? deliveryFrame;
    const previous = lastFrame.current;
    const sameFrame = previous?.points === basis && previous.outForDelivery === outForDelivery;
    const riderPoint = riderLat !== undefined && riderLng !== undefined
      ? { latitude: riderLat, longitude: riderLng }
      : null;

    if (roadRoute && riderPoint) {
      if (sameFrame && previous.focus && mapDistanceMeters(previous.focus, riderPoint) < CAMERA_ADVANCE_METERS) return;
      lastFrame.current = { points: basis, outForDelivery, focus: riderPoint };
      const camera = { center: riderPoint, zoom: RIDER_FOLLOW_ZOOM };
      if (reduceMotion) map.setCamera(camera);
      else map.animateCamera(camera, { duration: 450 });
      return;
    }

    // Before pickup, or while waiting for a rider fix, frame the available pins
    // and road. A stale fix keeps the last camera position until GPS returns.
    if (sameFrame) return;
    const points = [...(roadAhead ?? deliveryFrame)];
    if (riderPoint) points.push(riderPoint);
    const first = points[0];
    if (!first) return;

    lastFrame.current = { points: basis, outForDelivery, focus: null };
    const hasExtent = points.some(point => point.latitude !== first.latitude || point.longitude !== first.longitude);
    if (hasExtent) {
      map.fitToCoordinates(points, {
        edgePadding: outForDelivery ? DELIVERY_PADDING : PICKUP_PADDING,
        animated: !reduceMotion,
      });
    } else {
      const camera = { center: first, zoom: 16, altitude: 1800 };
      if (reduceMotion) map.setCamera(camera);
      else map.animateCamera(camera, { duration: 400 });
    }
  }, [deliveryFrame, mapReady, outForDelivery, reduceMotion, riderLat, riderLng, roadAhead, roadRoute, userMoved]);

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
                if (details.isGesture) setPannedPhase(outForDelivery);
              }}
              onPanDrag={() => setPannedPhase(outForDelivery)}
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
              {dashes.map((coordinates, index) => (
                <Polyline key={index} coordinates={coordinates} strokeWidth={1.5} strokeColor={ENDPOINT_COLOR} />
              ))}
              {roadAhead && roadAhead.length >= 2 ? (
                <Polyline coordinates={roadAhead} strokeWidth={4} strokeColor={colors.primary} lineCap="round" />
              ) : null}
              {pickup ? <DeliveryEndpoint coordinate={pickup} isPickup /> : null}
              {destination ? <DeliveryEndpoint coordinate={destination} /> : null}
              {rider ? (
                <Marker
                  coordinate={toLatLng(rider)}
                  image={facesRight ? SCOOTER_RIGHT : SCOOTER_LEFT}
                  rotation={rotation}
                  anchor={{ x: 0.5, y: 0.5 }}
                  title="Your rider"
                  zIndex={2}
                />
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
      {outForDelivery || !showMap ? (
        <View className="flex-row items-center gap-2 px-5 py-3.5">
          <View style={[styles.dot, { backgroundColor: rider ? colors.success : '#9CA3AF' }]} />
          <Text className="flex-1 text-[13px] font-medium text-ink/70">{caption}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  endpoint: { width: 82, height: ENDPOINT_HEIGHT, alignItems: 'center' },
  endpointBody: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: ENDPOINT_COLOR,
    alignItems: 'center', justifyContent: 'center',
  },
  endpointTip: {
    marginTop: -1, borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 6,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: ENDPOINT_COLOR,
  },
  endpointDot: { width: 4, height: 4, marginTop: 2, borderRadius: 2, backgroundColor: ENDPOINT_COLOR },
  endpointLabel: {
    marginTop: 3, paddingHorizontal: 7, borderRadius: 4, overflow: 'hidden',
    backgroundColor: '#FFFFFF', borderColor: '#DFE1E4', borderWidth: StyleSheet.hairlineWidth,
    color: '#454B55', fontSize: 11, fontWeight: '600', lineHeight: 17,
    textAlign: 'center', includeFontPadding: false,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
});

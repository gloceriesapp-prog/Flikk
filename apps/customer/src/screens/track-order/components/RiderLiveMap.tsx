// Live rider position on a small map, shown on TrackOrderScreen only while
// the order is out for delivery. Data: useRiderLocation (polls every ~10s
// while focused). The rider marker is hidden whenever the position is
// missing or stale; the delivery pin stays so the card never looks broken.
//
// Map conventions follow LocationSearchScreen: Google provider + grayscale
// style on Android (and iOS once a Google key ships), Apple Maps muted
// otherwise. react-native-maps isn't in Expo Go and a native map failure
// shouldn't take down the tracker, so both fall back to the caption alone.
import { Component, useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Home01Icon, Motorbike01Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../../components/AppIcon';
import { GRAYSCALE_MAP_STYLE } from '../../../location/mapStyle';
import { colors } from '../../../theme/tokens';
import type { MapCoordinates, RiderLocationResponse } from '../../../api/tracking';
import { riderMapView } from '../state/riderLocationView';

const HAS_IOS_GOOGLE_MAPS = Constants.expoConfig?.extra?.hasIosGoogleMaps === true;
const USES_GOOGLE_MAPS = Platform.OS === 'android' || HAS_IOS_GOOGLE_MAPS;
const MAPS_AVAILABLE = Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
const MAP_HEIGHT = 200;
const EDGE_PADDING = { top: 56, right: 56, bottom: 56, left: 56 };
const AGE_TICK_MS = 5_000;

const toLatLng = (c: MapCoordinates) => ({ latitude: c.lat, longitude: c.lng });

class MapBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}

interface Props {
  response: RiderLocationResponse | undefined;
  fetchedAt: number;
}

export function RiderLiveMap({ response, fetchedAt }: Props) {
  const [now, setNow] = useState(() => Date.now());
  const [mapFailed, setMapFailed] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [userMoved, setUserMoved] = useState(false);
  const mapRef = useRef<MapView>(null);

  // Keeps "updated Xs ago" honest between polls.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), AGE_TICK_MS);
    return () => clearInterval(timer);
  }, []);

  const view = riderMapView(response, fetchedAt, now);
  const { rider, destination } = view;
  const riderLat = rider?.lat; const riderLng = rider?.lng;
  const destLat = destination?.lat; const destLng = destination?.lng;

  // Frame rider + delivery pin together; stop following once the customer
  // pans, until they tap Recenter.
  useEffect(() => {
    if (!mapReady || userMoved || !mapRef.current) return;
    const points = [
      riderLat !== undefined && riderLng !== undefined ? { latitude: riderLat, longitude: riderLng } : null,
      destLat !== undefined && destLng !== undefined ? { latitude: destLat, longitude: destLng } : null,
    ].filter((p): p is { latitude: number; longitude: number } => p !== null);
    if (points.length === 2) mapRef.current.fitToCoordinates(points, { edgePadding: EDGE_PADDING, animated: true });
    else if (points.length === 1) mapRef.current.animateCamera({ center: points[0], zoom: 15 }, { duration: 400 });
  }, [mapReady, userMoved, riderLat, riderLng, destLat, destLng]);

  if (!response?.active) return null;
  const anchor = rider ?? destination;
  const showMap = MAPS_AVAILABLE && !mapFailed && anchor !== null;

  return (
    <View className="w-full overflow-hidden rounded-3xl bg-white" accessible={!showMap} accessibilityLabel={view.caption}>
      {showMap ? (
        <View style={{ height: MAP_HEIGHT }}>
          <MapBoundary onError={() => setMapFailed(true)}>
            <MapView
              ref={mapRef}
              style={StyleSheet.absoluteFill}
              provider={USES_GOOGLE_MAPS ? PROVIDER_GOOGLE : undefined}
              customMapStyle={USES_GOOGLE_MAPS ? GRAYSCALE_MAP_STYLE : undefined}
              mapType={USES_GOOGLE_MAPS ? 'standard' : 'mutedStandard'}
              initialRegion={{ ...toLatLng(anchor), latitudeDelta: 0.02, longitudeDelta: 0.02 }}
              onMapReady={() => setMapReady(true)}
              onPanDrag={() => setUserMoved(true)}
              showsUserLocation={false}
              showsMyLocationButton={false}
              showsCompass={false}
              toolbarEnabled={false}
              rotateEnabled={false}
              pitchEnabled={false}
              accessibilityLabel={`Map. ${view.caption}`}
            >
              {destination ? (
                <Marker coordinate={toLatLng(destination)} anchor={{ x: 0.5, y: 0.5 }} title="Delivery address" zIndex={1}>
                  <View style={[styles.pin, styles.destinationPin]}>
                    <AppIcon icon={Home01Icon} size={16} color={colors.ink} />
                  </View>
                </Marker>
              ) : null}
              {rider ? (
                <Marker coordinate={toLatLng(rider)} anchor={{ x: 0.5, y: 0.5 }} title="Your rider" zIndex={2}>
                  <View style={[styles.pin, styles.riderPin]}>
                    <AppIcon icon={Motorbike01Icon} size={18} color={colors.ink} />
                  </View>
                </Marker>
              ) : null}
            </MapView>
          </MapBoundary>
          {userMoved ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Recenter map" onPress={() => setUserMoved(false)} hitSlop={8}
              className="absolute right-3 top-3 rounded-full bg-white px-3 py-1.5 shadow shadow-black/20">
              <Text className="text-[12.5px] font-semibold text-ink">Recenter</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      <View className="flex-row items-center gap-2 px-5 py-3.5">
        <View style={[styles.dot, { backgroundColor: rider ? colors.success : '#9CA3AF' }]} />
        <Text className="flex-1 text-[13px] font-medium text-ink/70">{view.caption}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pin: { alignItems: 'center', justifyContent: 'center', borderRadius: 999, borderWidth: 2, borderColor: '#FFFFFF' },
  destinationPin: { width: 32, height: 32, backgroundColor: colors.limeSoft },
  riderPin: { width: 38, height: 38, backgroundColor: colors.lime },
  dot: { width: 8, height: 8, borderRadius: 4 },
});

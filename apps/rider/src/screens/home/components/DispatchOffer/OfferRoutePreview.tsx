// A small static route preview for a dispatch offer — store pin, drop pin,
// straight connector, fitted to both. Deliberately NOT the live-GPS follow
// map (DeliveryMapView, OrderDetailScreen final leg only): no expo-location,
// no rider marker, non-interactive. It's a "here's roughly the route" glance
// from two fixed points, not live tracking — so it stays inside CLAUDE.md's
// scope line. Only rendered when both ends have real coords (parent guards),
// so a phantom {0,0} address never draws as null-island.
//
// Straight connector, not a routed line — same Directions-API caveat as
// DeliveryMapView. Needs a native dev build to render (react-native-maps
// isn't in Expo Go, SDK 52+); in Expo Go the parent simply omits it.

import { useRef } from 'react';
import { Platform, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Location01Icon, Store01Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../../../components/AppIcon';
import { colors } from '../../../../theme/tokens';
import { GRAYSCALE_MAP_STYLE } from '../../../../location/mapStyle';
import type { Coordinates } from '../../../../data/mockOrders';

interface Props {
  storeCoords: Coordinates;
  dropCoords: Coordinates;
}

export function OfferRoutePreview({ storeCoords, dropCoords }: Props) {
  const mapRef = useRef<MapView>(null);

  return (
    <View className="h-32 overflow-hidden rounded-2xl bg-mist">
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        pointerEvents="none"
        scrollEnabled={false}
        zoomEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        customMapStyle={Platform.OS === 'android' ? GRAYSCALE_MAP_STYLE : undefined}
        onLayout={() =>
          mapRef.current?.fitToCoordinates([storeCoords, dropCoords], {
            edgePadding: { top: 36, right: 36, bottom: 36, left: 36 },
            animated: false,
          })
        }
      >
        <Polyline coordinates={[storeCoords, dropCoords]} strokeColor="#3B82F6" strokeWidth={3} lineDashPattern={[8, 6]} />
        <Marker coordinate={storeCoords} anchor={{ x: 0.5, y: 0.5 }}>
          <View className="h-7 w-7 items-center justify-center rounded-full border-2 border-white" style={{ backgroundColor: colors.lime }}>
            <AppIcon icon={Store01Icon} size={12} color="#FFFFFF" />
          </View>
        </Marker>
        <Marker coordinate={dropCoords} anchor={{ x: 0.5, y: 0.5 }}>
          <View className="h-7 w-7 items-center justify-center rounded-full border-2 border-white" style={{ backgroundColor: '#3B82F6' }}>
            <AppIcon icon={Location01Icon} size={12} color="#FFFFFF" />
          </View>
        </Marker>
      </MapView>
    </View>
  );
}

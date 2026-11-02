import { Marker } from 'react-native-maps';
import { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import type { Coordinates } from '../../../location/geocoding';

// Existing Gloceries artwork for the manual pin overlay. Bundling it keeps
// address selection usable even when the artwork host is unavailable.
export const DELIVERY_PIN_IMAGE = require('../../../../assets/map/delivery-pin.png');
export const DELIVERY_PIN_SIZE = 64;
export const DELIVERY_PIN_TIP = 0.926;

export function DeliveryPinArtwork({ onLoad }: { onLoad?: () => void }) {
  return <Image source={DELIVERY_PIN_IMAGE} onLoad={onLoad} resizeMode="contain"
    style={{ width: DELIVERY_PIN_SIZE, height: DELIVERY_PIN_SIZE }} />;
}

// Native bitmap markers avoid Android's custom-view snapshot race, which can
// leave an image-only marker transparent even after its image has loaded.
const NATIVE_DELIVERY_PIN_IMAGE = require('../../../../assets/map/delivery-pin-native.png');
export function LiveLocationPin({ coordinate }: { coordinate: Coordinates }) {
  return <Marker testID="live-location-pin" coordinate={coordinate}
    image={NATIVE_DELIVERY_PIN_IMAGE} anchor={{ x: 0.5, y: DELIVERY_PIN_TIP }}
    zIndex={4} tracksViewChanges={false} tappable={false} />;
}

// A custom Google marker otherwise snapshots its view continuously, even
// though this halo never changes. Allow the initial native layout to draw,
// then stop snapshot tracking; coordinate updates still move the marker.
export function LiveLocationHalo({ coordinate }: { coordinate: Coordinates }) {
  const [laidOut, setLaidOut] = useState(false);
  const [tracking, setTracking] = useState(true);
  useEffect(() => {
    if (!laidOut) return;
    const timer = setTimeout(() => setTracking(false), 250);
    return () => clearTimeout(timer);
  }, [laidOut]);
  return (
    <>
      <Marker testID="device-location-marker" coordinate={coordinate}
        anchor={{ x: 0.5, y: 0.5 }} flat zIndex={1} tracksViewChanges={tracking} tappable={false}>
        <View testID="device-location-halo" collapsable={false}
          onLayout={() => setLaidOut(true)} style={styles.halo} />
      </Marker>
      {/* The blue dot sits behind the delivery pin at the same coordinate. */}
      <Marker testID="device-location-dot-marker" coordinate={coordinate}
        anchor={{ x: 0.5, y: 0.5 }} flat zIndex={3} tracksViewChanges={tracking} tappable={false}>
        <View testID="device-location-dot" collapsable={false} style={styles.dot} />
      </Marker>
    </>
  );
}

const styles = StyleSheet.create({
  dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#1447E6' },
  halo: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(20,71,230,0.14)' },
});

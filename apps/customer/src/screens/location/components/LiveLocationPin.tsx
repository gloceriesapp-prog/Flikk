import { Marker } from 'react-native-maps';
import { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
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

// Same bundled artwork in both selection modes. Keep the native snapshot
// updating until the local image has loaded, then stop repeated snapshots.
export function LiveLocationPin({ coordinate }: { coordinate: Coordinates }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [tracking, setTracking] = useState(true);
  useEffect(() => {
    if (!imageLoaded) return;
    const timer = setTimeout(() => setTracking(false), 250);
    return () => clearTimeout(timer);
  }, [imageLoaded]);
  return (
    <Marker testID="live-location-pin" coordinate={coordinate}
      anchor={{ x: 0.5, y: DELIVERY_PIN_TIP }} zIndex={2} tracksViewChanges={tracking}>
      <View collapsable={false} style={{ width: DELIVERY_PIN_SIZE, height: DELIVERY_PIN_SIZE }}>
        <DeliveryPinArtwork onLoad={() => setImageLoaded(true)} />
      </View>
    </Marker>
  );
}

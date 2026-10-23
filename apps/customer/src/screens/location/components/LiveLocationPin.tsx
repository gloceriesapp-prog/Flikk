import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { View } from 'react-native';
import { Marker } from 'react-native-maps';
import { AppImage } from '../../../components/AppImage';
import type { Coordinates } from '../../../location/geocoding';

// Native coordinate anchoring keeps the tip on GPS even during camera animation
// and when the address card changes the visible map's padding.
export function LiveLocationPin({ coordinate, uri, size, tipRatio }: {
  coordinate: Coordinates; uri: string; size: number; tipRatio: number;
}) {
  const marker = useRef<ComponentRef<typeof Marker>>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!loaded) return;
    const frame = requestAnimationFrame(() => marker.current?.redraw());
    return () => cancelAnimationFrame(frame);
  }, [loaded]);
  return (
    <Marker ref={marker} testID="live-location-pin" coordinate={coordinate}
      anchor={{ x: 0.5, y: tipRatio }} zIndex={2} tracksViewChanges={!loaded}>
      <View collapsable={false} style={{ width: size, height: size }}>
        <AppImage source={{ uri }} style={{ width: size, height: size }} contentFit="contain"
          transition={0} onLoad={() => setLoaded(true)} />
      </View>
    </Marker>
  );
}

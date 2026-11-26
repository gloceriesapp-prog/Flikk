import { useId, useMemo, useState } from 'react';
import { PanResponder, View } from 'react-native';
import Svg, { ClipPath, Defs, ForeignObject, G, Path } from 'react-native-svg';
import Animated, { useAnimatedProps, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { AppImage } from '../../../../components/AppImage';
import { PLACEHOLDER_IMAGE_URI } from '../../../../theme/placeholderImage';
import { cardDotWindow } from '../../../../components/ProductImageGallery';
import { notchedCardPath } from './notchedCardGeometry';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedG = Animated.createAnimatedComponent(G<{ matrix?: number[] }>);

export function NotchedProductGallery({ images, width, height, diameter, buttonWidth, available }: {
  images: readonly string[]; width: number; height: number; diameter: number; buttonWidth: SharedValue<number>; available: boolean;
}) {
  const baseId = `product-clip-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const [loaded, setLoaded] = useState<ReadonlySet<string>>(() => new Set());
  // A newly decoded native image invalidates the SVG's cached drawing.
  const id = `${baseId}-${loaded.size}`;
  const [index, setIndex] = useState(0);
  const [swiped, setSwiped] = useState(false);
  const offset = useSharedValue(0);
  const photos = images.length ? images : [PLACEHOLDER_IMAGE_URI];
  const pathProps = useAnimatedProps(() => ({ d: notchedCardPath(width, height, diameter, Math.max(0, buttonWidth.value - diameter), available) }));
  const slideProps = useAnimatedProps(() => ({ matrix: [1, 0, 0, 1, offset.value, 0] }));
  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => photos.length > 1 && Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.3,
    onPanResponderGrant: () => setSwiped(true),
    onPanResponderMove: (_, gesture) => { offset.set(Math.min(0, Math.max(-(photos.length - 1) * width, -index * width + gesture.dx))); },
    onPanResponderRelease: (_, gesture) => {
      const delta = Math.abs(gesture.dx) > width * 0.2 || Math.abs(gesture.vx) > 0.4 ? (gesture.dx < 0 ? 1 : -1) : 0;
      const next = Math.min(photos.length - 1, Math.max(0, index + delta));
      setIndex(next); offset.set(withTiming(-next * width, { duration: 180 }));
    },
    onPanResponderTerminate: () => { offset.set(withTiming(-index * width, { duration: 180 })); },
  }), [photos.length, index, width, offset]);
  return <View testID="product-photo-pager" style={{ width, height }} {...pan.panHandlers}>
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} accessible={false}>
      <Defs><ClipPath id={id}><AnimatedPath animatedProps={pathProps} /></ClipPath></Defs>
      <G clipPath={`url(#${id})`}>
        <Path d={`M0 0H${width}V${height}H0Z`} fill="#F9FAFB" />
        <AnimatedG animatedProps={slideProps}>
          {photos.map((uri, i) => i === 0 || swiped ? <ForeignObject key={`${i}:${uri}`} x={i * width} y={0} width={width} height={height}>
            <View style={{ width, height }}>
              <AppImage source={{ uri }} style={{ width, height }} resizeMode="contain" transition={0}
                onLoad={() => setLoaded(previous => previous.has(uri) ? previous : new Set([...previous, uri]))} />
            </View>
          </ForeignObject> : null)}
        </AnimatedG>
      </G>
      <AnimatedPath animatedProps={pathProps} fill="none" stroke="#E3E6EE" strokeWidth={1} />
    </Svg>
    {photos.length > 1 && <View pointerEvents="none" accessibilityLabel={`Photo ${index + 1} of ${photos.length}`}
      style={{ position: 'absolute', left: 8, bottom: 58, flexDirection: 'row', gap: 2 }}>
      {cardDotWindow(photos.length, index).map(i => <View key={i} style={{ width: 6, height: 6, borderRadius: 3,
        borderWidth: 1, borderColor: '#738078', backgroundColor: i === index ? '#738078' : '#FFFFFF' }} />)}
    </View>}
  </View>;
}

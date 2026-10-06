import { useCallback, useState } from 'react';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

import { LocationSelector } from '../../home/components/LocationSelector';
import { DeliveryModeSwitcher } from '../../home/components/DeliveryModeSwitcher';
import { HomeSearchBar } from '../../home/components/HomeSearchBar';
import { useIsOutsideOperatingHours } from '../../../utils/useOperatingHours';

const STORE_HEADER_GRADIENT = {
  colors: [
    '#83AFE0',
    '#9BC0E8',
    '#B7D2EF',
    '#D5E5F7',
  ] as const,
  stops: [0, 0.35, 0.68, 1] as const,
};

const COLLAPSE_DISTANCE = 50;

interface Props {
  onChangeLocation: () => void;
  onOpenSearch: () => void;
  scrollY: SharedValue<number>;
}

export function StoreHeader({
  onChangeLocation,
  onOpenSearch,
  scrollY,
}: Props) {
  const isClosed = useIsOutsideOperatingHours();
  const [rowHeight, setRowHeight] = useState(0);

  const onRowLayout = useCallback((event: LayoutChangeEvent) => {
    const measuredHeight = event.nativeEvent.layout.height;
    setRowHeight((current) => current || measuredHeight);
  }, []);

  const rowStyle = useAnimatedStyle(() => {
    const progress = interpolate(
      scrollY.value,
      [0, COLLAPSE_DISTANCE],
      [0, 1],
      Extrapolation.CLAMP,
    );

    return {
      height: rowHeight ? (1 - progress) * rowHeight : undefined,
      opacity: 1 - progress,
      marginBottom: (1 - progress) * 16,
    };
  });

  const gradientStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [0, COLLAPSE_DISTANCE],
      [1, 0.12],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <View className="overflow-hidden">
      <BlurView
        intensity={80}
        tint="dark"
        style={StyleSheet.absoluteFill}
      />

      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, gradientStyle]}
      >
        <LinearGradient
          colors={STORE_HEADER_GRADIENT.colors}
          locations={STORE_HEADER_GRADIENT.stops}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <View className="px-6 pb-5 pt-safe-offset-3">
        <Animated.View
          onLayout={onRowLayout}
          style={[styles.collapsibleRow, rowStyle]}
        >
          <View className="flex-row items-center justify-between">
            <View className="min-w-0 flex-1 pr-3">
              <LocationSelector
                onPress={onChangeLocation}
                isClosed={isClosed}
                light
              />
            </View>

            <DeliveryModeSwitcher light />
          </View>
        </Animated.View>

        <HomeSearchBar onPress={onOpenSearch} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  collapsibleRow: {
    overflow: 'hidden',
  },
});
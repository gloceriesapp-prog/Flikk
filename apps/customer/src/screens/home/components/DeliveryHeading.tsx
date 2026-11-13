import { useEffect, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { HighDemandBadge } from './HighDemandBadge';
import { GILROY } from '../../../theme/fonts';

// Shared across Home/category header mounts; a new app launch resets it.
let introPlayed = false;
const HOLD_MS = 1500;
const COLLAPSE_MS = 420;

export function DeliveryHeading({ minutes, light, highDemand = false }: { minutes: number; light: boolean; highDemand?: boolean }) {
  return <View style={styles.heading}>
    <View style={styles.estimate}><DeliveryEstimate minutes={minutes} light={light} compact={highDemand} /></View>
    {highDemand && <HighDemandBadge />}
  </View>;
}

function DeliveryEstimate({ minutes, light, compact }: { minutes: number; light: boolean; compact: boolean }) {
  const focused = useIsFocused();
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(introPlayed || reducedMotion ? 1 : 0);
  const brandWidth = useSharedValue(0);
  const shortWidth = useSharedValue(0);
  const fullWidth = useSharedValue(0);
  const [sizes, setSizes] = useState({ brand: 0, short: 0, full: 0, available: 0 });
  const ready = sizes.brand > 0 && sizes.short > 0 && sizes.full > 0 && sizes.available > 0;
  const fits = sizes.brand + sizes.short <= sizes.available;
  const color = light ? '#000000' : '#FFFFFF';
  const shortLabel = `in ${minutes} min`;
  const fullLabel = compact ? `In ${minutes} min` : `In ${minutes} minutes`;


  useEffect(() => {
    if (!ready || !focused) return;
    if (introPlayed || reducedMotion || !fits) {
      progress.value = 1;
      return;
    }
    if (AppState.currentState !== 'active') return;
    introPlayed = true;
    progress.value = 0;
    progress.value = withDelay(HOLD_MS, withTiming(1, { duration: COLLAPSE_MS, easing: Easing.inOut(Easing.cubic) }));
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active') {
        cancelAnimation(progress);
        progress.value = 1;
      }
    });
    return () => {
      subscription.remove();
      cancelAnimation(progress);
      progress.value = 1;
    };
  }, [ready, focused, fits, reducedMotion, progress]);

  const brandClip = useAnimatedStyle(() => ({ width: brandWidth.value * (1 - progress.value) }));
  // Shift the text under its left clipping edge: its leftmost letters leave
  // first, while the delivery estimate smoothly moves into the freed space.
  const brandText = useAnimatedStyle(() => ({ transform: [{ translateX: -brandWidth.value * progress.value }], opacity: 1 - progress.value }));
  const estimateWidth = useAnimatedStyle(() => ({ width: shortWidth.value + (fullWidth.value - shortWidth.value) * progress.value }));
  const shortOpacity = useAnimatedStyle(() => ({ opacity: 1 - progress.value }));
  const fullOpacity = useAnimatedStyle(() => ({ opacity: progress.value }));
  const measure = (key: 'brand' | 'short' | 'full' | 'available', width: number) => {
    if (key === 'brand') brandWidth.value = width;
    if (key === 'short') shortWidth.value = width;
    if (key === 'full') fullWidth.value = width;
    setSizes(previous => Math.abs(previous[key] - width) < 0.5 ? previous : { ...previous, [key]: width });
  };

  return (
    <View testID="home-delivery-heading" accessible accessibilityLabel={`Delivery in ${minutes} minutes`}
      onLayout={event => measure('available', event.nativeEvent.layout.width)} style={styles.container}>
      <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.measurements}>
        <Text style={styles.text} onLayout={event => measure('brand', event.nativeEvent.layout.width)}>Gloceries </Text>
        <Text style={styles.text} onLayout={event => measure('short', event.nativeEvent.layout.width)}>{shortLabel}</Text>
        <Text style={styles.text} onLayout={event => measure('full', event.nativeEvent.layout.width)}>{fullLabel}</Text>
      </View>
      {ready && fits ? <View style={styles.row} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Animated.View style={[styles.clip, brandClip]}>
          <Animated.Text numberOfLines={1} style={[styles.text, { color, width: sizes.brand }, brandText]}>Gloceries </Animated.Text>
        </Animated.View>
        <Animated.View style={[styles.clip, estimateWidth]}>
          <Animated.Text numberOfLines={1} style={[styles.text, { color, width: sizes.short }, shortOpacity]}>{shortLabel}</Animated.Text>
          <Animated.Text numberOfLines={1} style={[styles.text, styles.overlap, { color, width: sizes.full }, fullOpacity]}>{fullLabel}</Animated.Text>
        </Animated.View>
      </View> : <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[styles.text, { color }]}>{introPlayed || reducedMotion || compact || (ready && !fits) ? fullLabel : `Gloceries ${shortLabel}`}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { flexDirection: 'row', alignItems: 'center', gap: 7, width: '100%' },
  estimate: { flex: 1, minWidth: 0 },
  container: { width: '100%', minHeight: 28 },
  text: { fontFamily: GILROY.extrabold, fontSize: 22, lineHeight: 28, includeFontPadding: false },
  measurements: { position: 'absolute', opacity: 0, alignItems: 'flex-start' },
  row: { flexDirection: 'row', alignItems: 'center' },
  clip: { overflow: 'hidden', flexShrink: 0 },
  overlap: { position: 'absolute', left: 0, top: 0 },
});

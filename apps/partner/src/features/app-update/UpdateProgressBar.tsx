import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, View } from 'react-native';

interface Props { progress?: number; active: boolean }

export function UpdateProgressBar({ progress, active }: Props) {
  const [value] = useState(() => new Animated.Value(progress ?? 0));
  const [sweep] = useState(() => new Animated.Value(0));
  const [width, setWidth] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(true);
  const known = progress !== undefined;
  const percent = known ? Math.floor(progress * 100) : null;

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(enabled => { if (mounted) setReduceMotion(enabled); }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { mounted = false; subscription.remove(); };
  }, []);

  useEffect(() => {
    const animation = Animated.timing(value, {
      toValue: progress ?? 0, duration: reduceMotion ? 0 : 320,
      easing: Easing.out(Easing.cubic), useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, reduceMotion, value]);

  useEffect(() => {
    sweep.setValue(0);
    if (known || !active || reduceMotion) return;
    // Indeterminate motion signals activity, never a fabricated percentage.
    const animation = Animated.loop(Animated.timing(sweep, {
      toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true,
    }));
    animation.start();
    return () => animation.stop();
  }, [active, known, reduceMotion, sweep]);

  return (
    <View accessibilityRole="progressbar" accessibilityLabel="App update download"
      accessibilityValue={percent === null ? { text: active ? 'Downloading update' : 'Download paused' } : { min: 0, max: 100, now: percent }}
      onLayout={event => setWidth(event.nativeEvent.layout.width)}
      style={{ height: 7, marginTop: 24, borderRadius: 4, backgroundColor: '#EBECEF', overflow: 'hidden' }}>
      {known ? <Animated.View style={{ height: '100%', borderRadius: 4, backgroundColor: '#111111',
        width: value.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'], extrapolate: 'clamp' }) }} />
        : active && <Animated.View style={{ height: '100%', width: '30%', borderRadius: 4, backgroundColor: '#111111',
          transform: [{ translateX: reduceMotion ? width * 0.35 : sweep.interpolate({ inputRange: [0, 1], outputRange: [-width * 0.3, width] }) }] }} />}
    </View>
  );
}

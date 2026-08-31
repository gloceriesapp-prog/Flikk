// Circular countdown, ticked via setInterval re-render (100ms) — not
// Reanimated, no new dep needed for a ring that only has to shrink once a
// second's worth of visible steps; react-native-svg is already installed.

import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../theme/tokens';

interface Props {
  deadlineMs: number;
  totalMs: number;
  size?: number;
}

export function CountdownRing({ deadlineMs, totalMs, size = 56 }: Props) {
  const [remainingMs, setRemainingMs] = useState(() => Math.max(0, deadlineMs - Date.now()));

  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingMs(Math.max(0, deadlineMs - Date.now()));
    }, 100);
    return () => clearInterval(interval);
  }, [deadlineMs]);

  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(1, remainingMs / totalMs));
  const isUrgent = remainingMs <= totalMs * 0.3;

  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke="#E5E7EB" strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={isUrgent ? colors.danger : colors.limeDeep}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
      <Text className={`text-sm font-bold ${isUrgent ? 'text-danger' : 'text-ink'}`} style={{ fontVariant: ['tabular-nums'] }}>
        {Math.ceil(remainingMs / 1000)}
      </Text>
    </View>
  );
}

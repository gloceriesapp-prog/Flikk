// The decision-timer ring at the top of a dispatch offer — an SVG arc that
// depletes over the rider's decision window, seconds in the center. Purely
// a local "decide soon" nudge: there's no per-rider server deadline in the
// offer payload, so this counts down from when the card first mounted, not
// from a backend timestamp. It reports each tick up (onTick) and fires
// onExpire once at zero so the card can auto-dismiss.
// ponytail: mount-seeded window, not a server deadline — wire a real
// expires_at into the offer if dispatch ever sends one.

import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../../../../theme/tokens';

const SIZE = 56;
const STROKE = 4;
const R = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

interface Props {
  windowSeconds: number;
  onExpire: () => void;
  // Ring track (the unfilled groove). Defaults to a light tint that reads on a
  // dark card; a light surface passes a dark tint instead.
  trackColor?: string;
}

export function OfferCountdownRing({ windowSeconds, onExpire, trackColor = '#FFFFFF22' }: Props) {
  const [remaining, setRemaining] = useState(windowSeconds);
  const expired = useRef(false);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      const left = Math.max(0, windowSeconds - Math.floor((Date.now() - start) / 1000));
      setRemaining(left);
      if (left === 0 && !expired.current) {
        expired.current = true;
        clearInterval(id);
        onExpire();
      }
    }, 250);
    return () => clearInterval(id);
    // onExpire is stable (declared in the parent's render but only invoked
    // once via the expired guard) — intentionally not a dep to avoid
    // resetting the timer on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowSeconds]);

  const pct = remaining / windowSeconds;
  const urgent = remaining <= 10;
  const ringColor = urgent ? colors.coral : colors.lime;
  // Short windows (the real 30s decide timer) read as "27s"; long ones (the
  // __DEV__ demo window) as "29:59" so it isn't an unreadable "1799s".
  const label = remaining >= 60 ? `${Math.floor(remaining / 60)}:${(remaining % 60).toString().padStart(2, '0')}` : `${remaining}s`;

  return (
    <View style={{ width: SIZE, height: SIZE }} className="items-center justify-center">
      <Svg width={SIZE} height={SIZE} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={trackColor} strokeWidth={STROKE} fill="none" />
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          stroke={ringColor}
          strokeWidth={STROKE}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - pct)}
        />
      </Svg>
      <Text className="text-[15px] font-extrabold" style={{ color: ringColor, fontVariant: ['tabular-nums'] }}>
        {label}
      </Text>
    </View>
  );
}

// The decision-timer ring at the top of a dispatch offer — an SVG arc that
// depletes over the rider's decision window, seconds in the center. When the
// offer carries a real server deadline (`expiresAt`, derived from the
// backend's dispatch_broadcast_at + DISPATCH_OFFER_WINDOW_MS) the countdown
// tracks THAT, so it survives remounts and reflects the true remaining
// window. With no expiresAt (the __DEV__ demo sheet) it falls back to
// counting down from mount. It reports onExpire once per deadline at zero;
// each consumer decides what that means (the __DEV__ sheet auto-dismisses,
// the poll-authoritative inline list keeps the card and stays acceptable).
// ponytail: countdown compares the server-derived expiresAt against the
// client clock, so client clock skew shifts it — acceptable, the same skew
// any gig app lives with; the 45s dispatch poll re-syncs anyway.

import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../../../../theme/tokens';

const SIZE = 56;
const STROKE = 4;
const R = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

// Seconds left on the timer. With a real `expiresAt` (epoch ms) the remaining
// time is the true distance to that server deadline. Without one, the caller
// is on the mount-seeded path and passes `windowSeconds - elapsed`, preserving
// the old local-countdown behavior.
export function remainingSeconds(expiresAt: number | null | undefined, now: number, windowSeconds: number): number {
  if (expiresAt != null) return Math.max(0, Math.ceil((expiresAt - now) / 1000));
  return Math.max(0, windowSeconds);
}

interface Props {
  windowSeconds: number;
  onExpire: () => void;
  // Real server deadline (epoch ms). When provided, the ring counts down to
  // this instead of to mount time; the arc denominator stays windowSeconds.
  expiresAt?: number | null;
  // Ring track (the unfilled groove). Defaults to a light tint that reads on a
  // dark card; a light surface passes a dark tint instead.
  trackColor?: string;
}

export function OfferCountdownRing({ windowSeconds, onExpire, expiresAt, trackColor = '#FFFFFF22' }: Props) {
  const [remaining, setRemaining] = useState(() =>
    remainingSeconds(expiresAt, Date.now(), windowSeconds),
  );
  const expired = useRef(false);

  useEffect(() => {
    // Re-arm the fire-once guard whenever the deadline changes (a rebroadcast
    // pushes a fresh future expiresAt) so the ring can re-fire for the new
    // deadline; within a single deadline it still fires only once.
    expired.current = false;
    const start = Date.now();
    const tick = () => {
      // expiresAt path compares against the real deadline; mount-seeded path
      // feeds windowSeconds - elapsed through the same helper.
      const elapsedWindow = windowSeconds - Math.floor((Date.now() - start) / 1000);
      const left = remainingSeconds(expiresAt, Date.now(), elapsedWindow);
      setRemaining(left);
      if (left === 0 && !expired.current) {
        expired.current = true;
        clearInterval(id);
        onExpire();
      }
    };
    tick(); // fire immediately so an already-expired offer resolves at mount
    // #29: 1s tick — the label only ever changes once per second, so the old
    // 250ms (4Hz) interval was re-rendering the ring three extra times a second
    // for no visible change.
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
    // onExpire is stable (declared in the parent's render but only invoked
    // once via the expired guard) — intentionally not a dep to avoid
    // resetting the timer on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowSeconds, expiresAt]);

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

// Runnable self-check for remainingSeconds (apps/rider has no test runner —
// an assert block behind __DEV__ is the smallest thing that fails loudly if
// the countdown math regresses). Stripped from production bundles.
if (__DEV__) {
  const now = 1_000_000;
  console.assert(remainingSeconds(now + 30_000, now, 45) === 30, 'future expiresAt → positive seconds');
  console.assert(remainingSeconds(now - 5_000, now, 45) === 0, 'past expiresAt → 0');
  console.assert(remainingSeconds(null, now, 45) === 45, 'null expiresAt → windowSeconds fallback');
}

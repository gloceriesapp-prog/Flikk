// The rider marker and the solid road line ahead of it. A new GPS fix does
// not jump the rider: it glides along the road from where it is drawn now to
// the new fix, turning with each bend, so the map moves like a real ride.
// Speed matches the real ride: the glide takes as long as the rider took
// between the two fixes (their GPS times), so 5 s pings while delivering and
// 45 s background pings both move continuously at the rider's real pace.
// The line always starts at the drawn rider. The first fix, a jump faster
// than a scooter can go (GPS glitch) and reduced motion snap instead.
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Marker, Polyline } from 'react-native-maps';
import type { DeliveryRoutePoint } from '../../../api/tracking';
import { colors } from '../../../theme/tokens';
import { RIDER_LOCATION_POLL_MS } from '../state/riderLocationView';
import { mapDistanceMeters, pathMeters, pointAlong, riderHeading } from '../state/routeProgress';

const RIDER = require('../../../../assets/illustrations/tracking-rider.png');
const SNAP_METERS = 1000;
// Fastest believable scooter speed (~90 km/h); anything faster is a GPS jump.
const MAX_METERS_PER_SECOND = 25;
const MIN_GLIDE_MS = 1_000;
const MAX_GLIDE_MS = 45_000;

// How long to take over this stretch: the real time between the two fixes,
// or one polling interval when that is unknown (first fix after a reload).
export function glideDuration(fixAt: number, previousFixAt: number | null): number {
  const elapsed = previousFixAt === null ? NaN : fixAt - previousFixAt;
  if (!Number.isFinite(elapsed) || elapsed <= 0) return RIDER_LOCATION_POLL_MS;
  return Math.min(MAX_GLIDE_MS, Math.max(MIN_GLIDE_MS, elapsed));
}

interface Props {
  // The latest GPS fix (primitives, so an unchanged fix never restarts a glide).
  latitude: number;
  longitude: number;
  // When the rider's phone took this fix (ms), from the server's updated_at.
  fixAt: number;
  // Road from the previous fix to this one, when both were on the route.
  glide: DeliveryRoutePoint[] | null;
  // Solid road line from the fix onward; null when the rider is off route.
  line: DeliveryRoutePoint[] | null;
  // Heading once the rider is at the fix (the road or the customer ahead).
  heading: number;
  reduceMotion: boolean;
}

export const GlidingRider = memo(function GlidingRider({ latitude, longitude, fixAt, glide, line, heading, reduceMotion }: Props) {
  const target = useMemo(() => ({ latitude, longitude }), [latitude, longitude]);
  const shown = useRef(target);
  const lastFixAt = useRef<number | null>(null);
  const [pose, setPose] = useState<{ point: DeliveryRoutePoint; ahead: DeliveryRoutePoint[] }>({ point: target, ahead: [] });

  useEffect(() => {
    const from = shown.current;
    let path = glide && glide.length >= 2 ? glide : [from, target];
    // Start from where the rider is drawn now, even mid-glide.
    if (mapDistanceMeters(path[0]!, from) > 1) path = [from, ...path.slice(1)];
    const meters = pathMeters(path);
    const duration = glideDuration(fixAt, lastFixAt.current);
    lastFixAt.current = fixAt;
    if (reduceMotion || meters < 1 || meters > SNAP_METERS || meters / (duration / 1000) > MAX_METERS_PER_SECOND) {
      shown.current = target;
      setPose({ point: target, ahead: [] });
      return;
    }
    let frame = 0;
    const started = Date.now();
    const tick = () => {
      const t = Math.min(1, (Date.now() - started) / duration);
      const { point, segment } = pointAlong(path, t);
      shown.current = point;
      setPose({ point, ahead: t < 1 ? [point, ...path.slice(segment + 1)] : [] });
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
    // fixAt changes with the target; read once per new fix.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, glide, reduceMotion]);

  const gliding = pose.ahead.length >= 2;
  // Face the road ahead while gliding; at the fix, the parent's heading.
  const rotation = (gliding ? riderHeading(pose.ahead) : null) ?? heading;
  const solid = line && line.length >= 2 ? (gliding ? [...pose.ahead.slice(0, -1), ...line] : line) : null;

  return (
    <>
      {solid ? <Polyline coordinates={solid} strokeWidth={4} strokeColor={colors.primary} lineCap="round" /> : null}
      <Marker
        coordinate={pose.point}
        image={RIDER}
        rotation={rotation}
        // Flat: the heading is relative to map north, like the road.
        flat
        anchor={{ x: 0.5, y: 0.5 }}
        title="Your rider"
        zIndex={2}
      />
    </>
  );
});

import type { DeliveryRoutePoint } from '../../../api/tracking';

const METERS_PER_DEGREE = 111_320;
const ON_ROUTE_TOLERANCE_METERS = 35;
const MATCH_TIE_METERS = 5;

export interface RouteProgress {
  segment: number;
  fraction: number;
  point: DeliveryRoutePoint;
}

function longitudeScale(latitude: number) {
  return METERS_PER_DEGREE * Math.cos(latitude * Math.PI / 180);
}

export function mapDistanceMeters(a: DeliveryRoutePoint, b: DeliveryRoutePoint): number {
  return Math.hypot(
    (a.latitude - b.latitude) * METERS_PER_DEGREE,
    (a.longitude - b.longitude) * longitudeScale((a.latitude + b.latitude) / 2),
  );
}

// Project the GPS fix onto road segments. When roads cross or run close
// together, prefer the earlier match if it is almost as close.
export function matchRoute(
  route: DeliveryRoutePoint[],
  rider: DeliveryRoutePoint,
  previous?: RouteProgress,
): RouteProgress | null {
  let best: RouteProgress | null = null;
  let bestDistance = Infinity;
  const scale = longitudeScale(rider.latitude);

  for (let segment = previous?.segment ?? 0; segment < route.length - 1; segment += 1) {
    const start = route[segment]!;
    const end = route[segment + 1]!;
    const x = (start.longitude - rider.longitude) * scale;
    const y = (start.latitude - rider.latitude) * METERS_PER_DEGREE;
    const dx = (end.longitude - start.longitude) * scale;
    const dy = (end.latitude - start.latitude) * METERS_PER_DEGREE;
    const lengthSquared = dx * dx + dy * dy;
    if (!lengthSquared) continue;

    const minimum = previous?.segment === segment ? previous.fraction : 0;
    const fraction = Math.min(1, Math.max(minimum, -(x * dx + y * dy) / lengthSquared));
    const distance = Math.hypot(x + fraction * dx, y + fraction * dy);
    if (distance > ON_ROUTE_TOLERANCE_METERS || distance + MATCH_TIE_METERS >= bestDistance) continue;
    bestDistance = distance;
    best = {
      segment,
      fraction,
      point: {
        latitude: start.latitude + (end.latitude - start.latitude) * fraction,
        longitude: start.longitude + (end.longitude - start.longitude) * fraction,
      },
    };
  }

  return best;
}

export function remainingRoad(route: DeliveryRoutePoint[], progress: RouteProgress | null): DeliveryRoutePoint[] {
  if (!progress) return route;
  const ahead = route.slice(progress.segment + 1);
  if (progress.fraction === 1) return ahead;
  return [progress.point, ...ahead];
}

// Use a short stretch of road to face the scooter into the turn. Mirroring
// preserves the side-on artwork while a small tilt suggests the road angle.
export function scooterPose(road: DeliveryRoutePoint[] | null) {
  if (!road || road.length < 2) return { facesRight: false, rotation: 0 };
  const from = road[0]!;
  const ahead = road.find(point => mapDistanceMeters(from, point) >= 18) ?? road[road.length - 1]!;

  const east = (ahead.longitude - from.longitude) * longitudeScale(from.latitude);
  const north = (ahead.latitude - from.latitude) * METERS_PER_DEGREE;
  const facesRight = east > 0;
  const tilt = Math.atan2(north, Math.abs(east)) * 180 / Math.PI;
  const rotation = Math.max(-22, Math.min(22, facesRight ? -tilt : tilt));
  return { facesRight, rotation };
}
